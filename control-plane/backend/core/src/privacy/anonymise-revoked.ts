import type { Prisma, PrismaClient, RevocationScope } from '@open-derja/db';

export interface RevocationSubject {
  subjectSessionId: string | null;
  subjectUserId: string | null;
  scope: RevocationScope;
}

export interface ScrubPreview {
  submissionMetaRows: number;
  userRows: number;
  auditLogRows: number;
  documentsMarkedRevoked: number;
  mediaRowsDeleted: number;
}

const NO_MATCH = '00000000-0000-0000-0000-000000000000';

function submissionWhere(subject: RevocationSubject): Prisma.SubmissionMetaWhereInput {
  return subject.subjectSessionId ? { sessionId: subject.subjectSessionId } : { id: NO_MATCH };
}

export async function previewRevocationScrub(
  prisma: PrismaClient,
  subject: RevocationSubject,
): Promise<ScrubPreview> {
  const [submissionMetaRows, userRows, auditLogRows, documentsMarkedRevoked, mediaRowsDeleted] = await Promise.all([
    prisma.submissionMeta.count({ where: submissionWhere(subject) }),
    subject.subjectUserId ? prisma.user.count({ where: { id: subject.subjectUserId } }) : Promise.resolve(0),
    subject.subjectUserId ? prisma.auditLog.count({ where: { actorId: subject.subjectUserId } }) : Promise.resolve(0),
    prisma.document.count({
      where: {
        corpusItems: { some: { submission: submissionWhere(subject) } },
      },
    }),
    subject.scope === 'text'
      ? Promise.resolve(0)
      : subject.subjectSessionId
        ? prisma.media.count({ where: { speaker: { sessionId: subject.subjectSessionId } } })
        : Promise.resolve(0),
  ]);

  return { submissionMetaRows, userRows, auditLogRows, documentsMarkedRevoked, mediaRowsDeleted };
}

export async function anonymiseRevocation(
  prisma: PrismaClient,
  revocationId: string,
): Promise<{ scrubbedCount: number }> {
  const revocation = await prisma.consentRevocation.findUniqueOrThrow({ where: { id: revocationId } });
  const subject: RevocationSubject = {
    subjectSessionId: revocation.subjectSessionId,
    subjectUserId: revocation.subjectUserId,
    scope: revocation.scope,
  };
  const where = submissionWhere(subject);

  return prisma.$transaction(async (tx) => {
    const scrubTextConsent = subject.scope === 'text' || subject.scope === 'full';
    const scrubVoiceConsent = subject.scope === 'voice' || subject.scope === 'full';
    let scrubbedCount = 0;

    if (scrubTextConsent) {
      const targets = await tx.submissionMeta.findMany({
        where,
        select: { corpusItem: { select: { documentId: true } } },
      });
      const documentIds = [...new Set(targets.map((t) => t.corpusItem.documentId))];

      const affected = await tx.submissionMeta.updateMany({
        where,
        data: {
          contributorEmail: null,
          contributorName: null,
          ipHash: null,
          sessionId: null,
        },
      });
      scrubbedCount += affected.count;

      if (documentIds.length > 0) {
        await tx.document.updateMany({
          where: { id: { in: documentIds } },
          data: { rightsStatus: 'revoked' },
        });
      }

      if (subject.subjectUserId) {
        await tx.user.updateMany({
          where: { id: subject.subjectUserId },
          data: { email: null, displayName: null },
        });
        await tx.auditLog.updateMany({
          where: { actorId: subject.subjectUserId },
          data: { ipHash: null, diff: {} },
        });
      }
    }

    if (scrubVoiceConsent && subject.subjectSessionId) {
      const media = await tx.media.findMany({
        where: { speaker: { sessionId: subject.subjectSessionId } },
        select: { id: true, storedObjectId: true },
      });
      for (const row of media) {
        await tx.media.delete({ where: { id: row.id } });
        await tx.storedObject.update({
          where: { id: row.storedObjectId },
          data: { status: 'deleted', deletedAt: new Date() },
        });
      }
      scrubbedCount += media.length;
    }

    await tx.consentRevocation.update({
      where: { id: revocationId },
      data: { status: 'processed', processedAt: new Date(), scrubbedCount },
    });

    await tx.auditLog.create({
      data: {
        action: 'consent_revocation_processed',
        entityType: 'consent_revocation',
        entityId: revocationId,
        diff: { scope: subject.scope, scrubbedCount, at: new Date().toISOString() },
      },
    });

    return { scrubbedCount };
  });
}

export async function processPendingRevocations(prisma: PrismaClient): Promise<{ processed: number }> {
  const pending = await prisma.consentRevocation.findMany({ where: { status: 'pending' }, select: { id: true } });
  let processed = 0;
  for (const row of pending) {
    try {
      await anonymiseRevocation(prisma, row.id);
      processed += 1;
    } catch {
      await prisma.consentRevocation.update({ where: { id: row.id }, data: { status: 'failed' } });
    }
  }
  return { processed };
}

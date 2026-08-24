import { Injectable } from '@nestjs/common';
import type { Prisma, Region, TagKind } from '@open-derja/db';
import { PrismaService } from '../../infra/database/prisma.service';

export interface AddTagParams {
  corpusItemId: string;
  kind: TagKind;
  value: string;
  charStart: number;
  charEnd: number;
  annotatorId: string;
  isMachine: boolean;
  confidence?: number;
}

export interface AddTokenParams {
  corpusItemId: string;
  charStart: number;
  charEnd: number;
  surfaceText: string;
  annotatorId: string;
  isMachine: boolean;
  confidence?: number;
}

export interface AddLinkParams {
  tokenId: string;
  lexiconEntryId: string;
  lexiconVariantId?: string;
  annotatorId: string;
  isMachine: boolean;
  confidence?: number;
}

@Injectable()
export class AnnotationsService {
  constructor(private readonly prisma: PrismaService) {}

  async addTag(params: AddTagParams, client: PrismaService | Prisma.TransactionClient = this.prisma) {
    return client.tag.create({
      data: {
        corpusItemId: params.corpusItemId,
        kind: params.kind,
        value: params.value,
        charStart: params.charStart,
        charEnd: params.charEnd,
        annotatorId: params.annotatorId,
        isMachine: params.isMachine,
        confidence: params.confidence,
      },
    });
  }

  async addFullSpanTag(
    params: Omit<AddTagParams, 'charStart' | 'charEnd'> & { textLength: number },
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    return this.addTag({ ...params, charStart: 0, charEnd: params.textLength }, client);
  }

  async addRegionTags(
    params: {
      corpusItemId: string;
      regions: Region[];
      textLength: number;
      annotatorId: string;
      isMachine: boolean;
    },
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const rows = [];
    for (const region of params.regions) {
      rows.push(
        await this.addFullSpanTag(
          {
            corpusItemId: params.corpusItemId,
            kind: 'region',
            value: region,
            textLength: params.textLength,
            annotatorId: params.annotatorId,
            isMachine: params.isMachine,
          },
          client,
        ),
      );
    }
    return rows;
  }

  async addToken(params: AddTokenParams, client: PrismaService | Prisma.TransactionClient = this.prisma) {
    return client.token.create({
      data: {
        corpusItemId: params.corpusItemId,
        charStart: params.charStart,
        charEnd: params.charEnd,
        surfaceText: params.surfaceText,
        annotatorId: params.annotatorId,
        isMachine: params.isMachine,
        confidence: params.confidence,
      },
    });
  }

  async addLink(params: AddLinkParams, client: PrismaService | Prisma.TransactionClient = this.prisma) {
    return client.link.create({
      data: {
        tokenId: params.tokenId,
        lexiconEntryId: params.lexiconEntryId,
        lexiconVariantId: params.lexiconVariantId,
        annotatorId: params.annotatorId,
        isMachine: params.isMachine,
        confidence: params.confidence,
      },
    });
  }
}

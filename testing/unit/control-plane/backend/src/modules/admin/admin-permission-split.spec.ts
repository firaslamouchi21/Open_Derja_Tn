import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../../../../../control-plane/backend/src/common/decorators/roles.decorator';
import { OverviewController } from '../../../../../../../control-plane/backend/src/modules/admin/overview/overview.controller';
import { DataController } from '../../../../../../../control-plane/backend/src/modules/admin/data/data.controller';
import { ReviewLanesController } from '../../../../../../../control-plane/backend/src/modules/admin/review-lanes/review-lanes.controller';
import { TaskAdminController } from '../../../../../../../control-plane/backend/src/modules/admin/task-admin/task-admin.controller';
import { SourcesAdminController } from '../../../../../../../control-plane/backend/src/modules/admin/sources-admin/sources-admin.controller';
import { UsersAdminController } from '../../../../../../../control-plane/backend/src/modules/admin/users-admin/users-admin.controller';
import { SnapshotsController } from '../../../../../../../control-plane/backend/src/modules/admin/snapshots/snapshots.controller';
import { PrivacyController } from '../../../../../../../control-plane/backend/src/modules/admin/privacy/privacy.controller';
import { SystemController } from '../../../../../../../control-plane/backend/src/modules/admin/system/system.controller';

const reflector = new Reflector();

function classRoles(ctrl: object): string[] | undefined {
  return reflector.get<string[]>(ROLES_KEY, ctrl);
}
function methodRoles(ctrl: { prototype: object }, method: string): string[] | undefined {
  return reflector.get<string[]>(ROLES_KEY, (ctrl.prototype as Record<string, object>)[method]);
}

describe('two-tier admin permission split', () => {
  it('content sections are open to admin + superadmin', () => {
    for (const ctrl of [
      OverviewController,
      DataController,
      ReviewLanesController,
      TaskAdminController,
      SourcesAdminController,
      UsersAdminController,
    ]) {
      expect(classRoles(ctrl)).toEqual(['admin', 'superadmin']);
    }
  });

  it('platform-ops sections are superadmin-only', () => {
    for (const ctrl of [SnapshotsController, PrivacyController, SystemController]) {
      expect(classRoles(ctrl)).toEqual(['superadmin']);
    }
  });

  it('destructive routes inside content sections are escalated to superadmin', () => {
    expect(methodRoles(DataController, 'rejectScrapeBatch')).toEqual(['superadmin']);
    expect(methodRoles(DataController, 'reassignRegion')).toEqual(['superadmin']);
    expect(methodRoles(DataController, 'mergeLexicon')).toEqual(['superadmin']);
    expect(methodRoles(UsersAdminController, 'setRole')).toEqual(['superadmin']);
  });

  it('non-escalated content routes inherit the class-level admin grant', () => {
    expect(methodRoles(UsersAdminController, 'ban')).toBeUndefined();
    expect(methodRoles(DataController, 'browse')).toBeUndefined();
  });
});

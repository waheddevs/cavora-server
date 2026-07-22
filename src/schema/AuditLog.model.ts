import { model, Schema } from 'mongoose';
import { AuditActorType } from '../libs/enums/audit.enum';
import type { AuditLog } from '../libs/types/audit';

const auditLogSchema = new Schema<AuditLog>(
  {
    actorType: {
      type: String,
      enum: Object.values(AuditActorType),
      required: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    entityId: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    requestId: {
      type: String,
      maxlength: 128,
    },
    ipAddress: {
      type: String,
      maxlength: 64,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true, collection: 'audit_logs' },
);

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ requestId: 1 }, { sparse: true });

export default model<AuditLog>('AuditLog', auditLogSchema);

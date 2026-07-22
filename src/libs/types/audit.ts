import type { Types } from 'mongoose';
import type { AuditActorType } from '../enums/audit.enum';

export interface AuditLog {
  _id: Types.ObjectId;
  actorType: AuditActorType;
  actorId?: Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: string;
  requestId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

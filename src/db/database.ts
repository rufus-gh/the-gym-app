import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';
import { UserModel } from './models/User';
import { ExerciseModel } from './models/Exercise';
import { WorkoutTemplateModel } from './models/WorkoutTemplate';
import { TemplateExerciseModel } from './models/TemplateExercise';
import { TemplateSetModel } from './models/TemplateSet';
import { ProgramModel } from './models/Program';
import { ProgramSlotModel } from './models/ProgramSlot';
import { WorkoutSessionModel } from './models/WorkoutSession';
import { SessionExerciseModel } from './models/SessionExercise';
import { SetModel } from './models/Set';
import { PersonalRecordModel } from './models/PersonalRecord';
import { BodyMeasurementModel } from './models/BodyMeasurement';
import { NutritionLogModel } from './models/NutritionLog';
import { SupersetGroupModel } from './models/SupersetGroup';
import { SyncMetadataModel } from './models/SyncMetadata';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
  onSetUpError: (error) => {
    console.error('[DB] Setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    UserModel,
    ExerciseModel,
    WorkoutTemplateModel,
    TemplateExerciseModel,
    TemplateSetModel,
    ProgramModel,
    ProgramSlotModel,
    WorkoutSessionModel,
    SessionExerciseModel,
    SetModel,
    PersonalRecordModel,
    BodyMeasurementModel,
    NutritionLogModel,
    SupersetGroupModel,
    SyncMetadataModel,
  ],
});

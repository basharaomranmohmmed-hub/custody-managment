import { IsBoolean } from 'class-validator';

export class UpdateDepartmentStatusDto {
  @IsBoolean()
  is_active: boolean;
}

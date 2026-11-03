import { IsBoolean } from 'class-validator';

export class UpdateCustodyTypeStatusDto {
  @IsBoolean()
  is_active: boolean;
}

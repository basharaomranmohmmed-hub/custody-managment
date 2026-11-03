import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

export class LinkItemEventsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  item_event_uuids: string[];
}

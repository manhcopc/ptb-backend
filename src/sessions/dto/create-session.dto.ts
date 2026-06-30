import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
    @ApiPropertyOptional({ description: 'Optional initial configuration object' })
    // Can be expanded later if initial config is needed
    config?: any;
}

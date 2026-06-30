import { Module, forwardRef } from '@nestjs/common';
import { BoothGateway } from './booth.gateway';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
    imports: [forwardRef(() => SessionsModule)],
    providers: [BoothGateway],
    exports: [BoothGateway],
})
export class GatewayModule { }

import { Controller, Get, Post, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('api/admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @ApiOperation({ summary: 'Get dashboard statistics', operationId: 'getAdminStats' })
    @ApiResponse({ status: 200, description: 'Return statistics about sessions and media.' })
    @Get('stats')
    getStats() {
        return this.adminService.getStats();
    }

    @ApiOperation({ summary: 'Get paginated list of sessions', operationId: 'getAdminSessions' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
    @ApiResponse({ status: 200, description: 'Return paginated sessions with total count.' })
    @Get('sessions')
    findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        return this.adminService.findAllSessions(page, limit);
    }

    @ApiOperation({ summary: 'Resend email to customer', operationId: 'resendSessionEmail' })
    @ApiResponse({ status: 201, description: 'Email has been resent.' })
    @Post('sessions/:id/resend-email')
    resendEmail(@Param('id') id: string) {
        return this.adminService.resendEmail(id);
    }
}

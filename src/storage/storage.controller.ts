import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { StorageService } from './storage.service';
import { CreatePresignedUrlDto } from './dto/create-presigned-url.dto';

@ApiTags('Storage')
@Controller('storage')
@UseGuards(AccessTokenGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class StorageController {
    constructor(private readonly storageService: StorageService) {}

    @Post('presigned-url')
    @Roles('admin', 'staff')
    @ApiOperation({ summary: 'Get a presigned URL for file upload to Cloudflare R2' })
    @ApiResponse({
        status: 201,
        description: 'Presigned URL generated successfully',
        schema: {
            example: {
                uploadUrl: 'https://...',
                fileUrl: 'https://...',
                key: '...',
            },
        },
    })
    async getPresignedUrl(@Body() dto: CreatePresignedUrlDto) {
        return await this.storageService.getPresignedUrl(
            dto.fileName,
            dto.contentType,
            dto.folder,
        );
    }
}

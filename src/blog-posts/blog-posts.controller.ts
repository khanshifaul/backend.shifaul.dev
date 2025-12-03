import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { BlogPostQueryDto } from './dto/blog-post-query.dto';
import { BlogPostsService } from './blog-posts.service';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@ApiTags('Blog Posts')
@Controller('blog-posts')
@UseGuards(AccessTokenGuard)
@ApiBearerAuth('access-token')
export class BlogPostsController {
  constructor(private readonly blogPostsService: BlogPostsService) {}

  private createSuccessResponse<T>(message: string, data?: T): ApiResponse<T> {
    return { success: true, message, data };
  }

  private createPaginatedResponse<T>(
    message: string,
    data: T,
    pagination: any,
  ): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      pagination,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new blog post' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'slug', 'content', 'thumbnail'],
      properties: {
        title: {
          type: 'string',
          example: 'Understanding TypeScript Generics',
        },
        slug: {
          type: 'string',
          example: 'understanding-typescript-generics',
        },
        content: {
          type: 'string',
          example: '# Introduction\\n\\nThis is a blog post about TypeScript generics...\\n\\n```typescript\\nfunction identity<T>(arg: T): T {\\n  return arg;\\n}\\n```',
        },
        thumbnail: {
          type: 'string',
          example: 'https://example.com/images/typescript-generics.jpg',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          example: ['typescript', 'programming', 'generics'],
        },
        published: {
          type: 'boolean',
          example: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Blog post created successfully',
    schema: {
      example: {
        success: true,
        message: 'Blog post created successfully',
        data: {
          id: 'blog-post-id',
          title: 'Understanding TypeScript Generics',
          slug: 'understanding-typescript-generics',
          content: '# Introduction\\n\\nThis is a blog post...',
          thumbnail: 'https://example.com/images/typescript-generics.jpg',
          tags: [
            {
              id: 'tag-id',
              name: 'typescript',
            },
          ],
          authorId: 'user-id',
          authorName: 'John Doe',
          published: false,
          reactions: 0,
          views: 0,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  async createBlogPost(
    @User() user: any,
    @Body() dto: CreateBlogPostDto,
  ): Promise<ApiResponse> {
    const blogPost = await this.blogPostsService.createBlogPost(
      user.id,
      user.name || user.email,
      dto,
    );
    return this.createSuccessResponse('Blog post created successfully', blogPost);
  }

  @Get()
  @ApiOperation({ summary: 'Get blog posts with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'published', required: false, type: Boolean })
  @ApiQuery({ name: 'author', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  @ApiQuery({ name: 'minViews', required: false, type: Number })
  @ApiQuery({ name: 'minReactions', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Blog posts retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Blog posts retrieved successfully',
        data: [
          {
            id: 'blog-post-id',
            title: 'Understanding TypeScript Generics',
            slug: 'understanding-typescript-generics',
            thumbnail: 'https://example.com/images/typescript-generics.jpg',
            tags: [
              {
                id: 'tag-id',
                name: 'typescript',
              },
            ],
            authorName: 'John Doe',
            published: true,
            reactions: 5,
            views: 150,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            _count: {
              tags: 1,
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      },
    },
  })
  async getBlogPosts(@Query() query: BlogPostQueryDto): Promise<ApiResponse> {
    const result = await this.blogPostsService.getBlogPosts(query);
    return this.createPaginatedResponse(
      'Blog posts retrieved successfully',
      result.blogPosts,
      result.pagination,
    );
  }

  @Get('published')
  @ApiOperation({ summary: 'Get published blog posts only' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'author', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  @ApiQuery({ name: 'minViews', required: false, type: Number })
  @ApiQuery({ name: 'minReactions', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Published blog posts retrieved successfully',
  })
  async getPublishedBlogPosts(@Query() query: BlogPostQueryDto): Promise<ApiResponse> {
    const result = await this.blogPostsService.getPublishedBlogPosts(query);
    return this.createPaginatedResponse(
      'Published blog posts retrieved successfully',
      result.blogPosts,
      result.pagination,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get blog posts by a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'User blog posts retrieved successfully',
  })
  async getUserBlogPosts(
    @Param('userId') userId: string,
    @Query() query: BlogPostQueryDto,
  ): Promise<ApiResponse> {
    const result = await this.blogPostsService.getUserBlogPosts(userId, query);
    return this.createPaginatedResponse(
      'User blog posts retrieved successfully',
      result.blogPosts,
      result.pagination,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get blog post statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Blog post statistics retrieved successfully',
        data: {
          total: 25,
          published: 20,
          draft: 5,
          totalViews: 1500,
          totalReactions: 75,
        },
      },
    },
  })
  async getBlogPostStats(): Promise<ApiResponse> {
    const stats = await this.blogPostsService.getBlogPostStats();
    return this.createSuccessResponse('Blog post statistics retrieved successfully', stats);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific blog post by ID' })
  @ApiParam({ name: 'id', description: 'Blog Post ID' })
  @ApiQuery({ name: 'incrementViews', required: false, type: Boolean, description: 'Whether to increment view count' })
  @ApiResponse({
    status: 200,
    description: 'Blog post retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Blog post retrieved successfully',
        data: {
          id: 'blog-post-id',
          title: 'Understanding TypeScript Generics',
          slug: 'understanding-typescript-generics',
          content: '# Introduction\\n\\nThis is a blog post about TypeScript generics...',
          thumbnail: 'https://example.com/images/typescript-generics.jpg',
          tags: [
            {
              id: 'tag-id',
              name: 'typescript',
            },
          ],
          authorId: 'user-id',
          authorName: 'John Doe',
          published: true,
          reactions: 5,
          views: 151,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found',
  })
  async getBlogPostById(
    @Param('id') blogPostId: string,
    @Query('incrementViews') incrementViews?: boolean,
  ): Promise<ApiResponse> {
    const blogPost = await this.blogPostsService.getBlogPostById(
      blogPostId,
      incrementViews || false,
    );
    return this.createSuccessResponse('Blog post retrieved successfully', blogPost);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a specific blog post by slug' })
  @ApiParam({ name: 'slug', description: 'Blog Post Slug' })
  @ApiQuery({ name: 'incrementViews', required: false, type: Boolean, description: 'Whether to increment view count' })
  @ApiResponse({
    status: 200,
    description: 'Blog post retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found',
  })
  async getBlogPostBySlug(
    @Param('slug') slug: string,
    @Query('incrementViews') incrementViews?: boolean,
  ): Promise<ApiResponse> {
    const blogPost = await this.blogPostsService.getBlogPostBySlug(
      slug,
      incrementViews || false,
    );
    return this.createSuccessResponse('Blog post retrieved successfully', blogPost);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a blog post' })
  @ApiParam({ name: 'id', description: 'Blog Post ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          example: 'Advanced TypeScript Generics: Practical Examples',
        },
        slug: {
          type: 'string',
          example: 'advanced-typescript-generics-practical-examples',
        },
        content: {
          type: 'string',
          example: '# Advanced Introduction\\n\\nThis is an updated blog post...',
        },
        thumbnail: {
          type: 'string',
          example: 'https://example.com/images/advanced-typescript-generics.jpg',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          example: ['typescript', 'programming', 'generics', 'advanced'],
        },
        published: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Blog post updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found',
  })
  async updateBlogPost(
    @Param('id') blogPostId: string,
    @Body() dto: UpdateBlogPostDto,
    @User() user: any,
  ): Promise<ApiResponse> {
    const blogPost = await this.blogPostsService.updateBlogPost(
      blogPostId,
      user.id,
      user.roles,
      dto,
    );
    return this.createSuccessResponse('Blog post updated successfully', blogPost);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a blog post' })
  @ApiParam({ name: 'id', description: 'Blog Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Blog post deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found',
  })
  async deleteBlogPost(
    @Param('id') blogPostId: string,
    @User() user: any,
  ): Promise<ApiResponse> {
    const result = await this.blogPostsService.deleteBlogPost(
      blogPostId,
      user.id,
      user.roles,
    );
    return this.createSuccessResponse(result.message);
  }

  @Post(':id/reactions')
  @ApiOperation({ summary: 'Add a reaction to a blog post' })
  @ApiParam({ name: 'id', description: 'Blog Post ID' })
  @ApiResponse({
    status: 201,
    description: 'Reaction added successfully',
    schema: {
      example: {
        success: true,
        message: 'Reaction added successfully',
        data: {
          reactions: 6,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot add reaction to unpublished post',
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found',
  })
  async addReaction(
    @Param('id') blogPostId: string,
    @User() user: any,
  ): Promise<ApiResponse> {
    const result = await this.blogPostsService.addReaction(blogPostId, user.id);
    return this.createSuccessResponse('Reaction added successfully', result);
  }

  @Delete(':id/reactions')
  @ApiOperation({ summary: 'Remove a reaction from a blog post' })
  @ApiParam({ name: 'id', description: 'Blog Post ID' })
  @ApiResponse({
    status: 200,
    description: 'Reaction removed successfully',
    schema: {
      example: {
        success: true,
        message: 'Reaction removed successfully',
        data: {
          reactions: 4,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot remove reaction from post with no reactions',
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found',
  })
  async removeReaction(
    @Param('id') blogPostId: string,
    @User() user: any,
  ): Promise<ApiResponse> {
    const result = await this.blogPostsService.removeReaction(blogPostId, user.id);
    return this.createSuccessResponse('Reaction removed successfully', result);
  }
}
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  constructor(private readonly repository: CategoriesRepository) {}

  async findAll() {
    return this.repository.findAll();
  }

  async create(dto: CreateCategoryDto) {
    return this.repository.create({
      name: dto.name,
      customFields: dto.customFields || [],
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.repository.findOne(id);
    if (!category) throw new NotFoundException('Category not found');
    return this.repository.update(id, {
      ...(dto.name && { name: dto.name }),
      ...(dto.customFields !== undefined && { customFields: dto.customFields }),
      ...(dto.status && { status: dto.status }),
    });
  }
}

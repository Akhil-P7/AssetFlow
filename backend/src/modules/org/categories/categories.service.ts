import { Injectable, Logger } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  constructor(private readonly repository: CategoriesRepository) {}

  async findAll() {
    /* TODO */ return [];
  }
  async create(dto: any) {
    /* TODO */ return null;
  }
  async update(id: string, dto: any) {
    /* TODO */ return null;
  }
}

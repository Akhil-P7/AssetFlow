import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AssetCategory } from './category.entity';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findAll() {
    return this.dataSource
      .getRepository(AssetCategory)
      .find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    return this.dataSource
      .getRepository(AssetCategory)
      .findOne({ where: { id } });
  }

  async create(data: Partial<AssetCategory>) {
    const repo = this.dataSource.getRepository(AssetCategory);
    const category = repo.create(data);
    return repo.save(category);
  }

  async update(id: string, data: Partial<AssetCategory>) {
    const repo = this.dataSource.getRepository(AssetCategory);
    await repo.update(id, data);
    return this.findOne(id);
  }
}

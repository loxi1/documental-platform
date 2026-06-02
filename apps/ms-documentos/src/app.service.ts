import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, NatsConnection } from 'nats';
import { createNatsClientOptions } from '@documental/shared';
import { sql } from '@documental/database';

@Injectable()
export class AppService implements OnModuleDestroy {
  private natsConnection: NatsConnection | null = null;

  constructor(private readonly config: ConfigService) {}

  async getHealth() {
    const postgres = await this.checkPostgres();
    const nats = await this.checkNats();

    return {
      service: 'ms-documentos',
      status: postgres === 'up' && nats === 'up' ? 'ok' : 'degraded',
      checks: {
        postgres,
        nats,
      },
    };
  }

  async getResumen() {
    const [docs] = await sql`SELECT COUNT(*)::int AS total FROM documentos.documentos`;
    const [archivos] = await sql`SELECT COUNT(*)::int AS total FROM documentos.documentos_archivos`;
    const [clientes] = await sql`SELECT COUNT(*)::int AS total FROM core.clientes_destino`;
    const [provs] = await sql`SELECT COUNT(*)::int AS total FROM core.proveedores`;

    return {
      documentos: docs.total,
      archivos: archivos.total,
      clientesDestino: clientes.total,
      proveedores: provs.total,
    };
  }

  private async checkPostgres(): Promise<'up' | 'down'> {
    try {
      await sql`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkNats(): Promise<'up' | 'down'> {
    try {
      if (!this.natsConnection || this.natsConnection.isClosed()) {
        const natsUrl = this.config.get<string>('nats.url') ?? 'nats://localhost:4222';

        this.natsConnection = await connect(
          createNatsClientOptions(natsUrl),
        );
      }

      return this.natsConnection.isClosed() ? 'down' : 'up';
    } catch {
      return 'down';
    }
  }

  async onModuleDestroy() {
    await sql.end();

    if (this.natsConnection && !this.natsConnection.isClosed()) {
      await this.natsConnection.close();
    }
  }
}

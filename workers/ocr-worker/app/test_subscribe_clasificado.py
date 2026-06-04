import asyncio
from nats.aio.client import Client as NATS

from app.config import settings


async def main():
    nc = NATS()

    await nc.connect(servers=[settings.nats_url])

    print("Escuchando documento.clasificado...")

    async def handler(msg):
        print("EVENTO documento.clasificado:")
        print(msg.data.decode())

    await nc.subscribe(
        "documento.clasificado",
        cb=handler,
    )

    while True:
        await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())
# EC2 Bootstrap

## Ejecutar

```bash
bash deployment/scripts/bootstrap-ec2.sh
```

## Validar

```bash
docker --version
docker compose version
sudo ufw status
```

## Regla

PostgreSQL productivo no se instala en EC2. Vive en AWS RDS.

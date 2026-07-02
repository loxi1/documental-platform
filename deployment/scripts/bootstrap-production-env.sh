if [ ! -f deployment/env/.env.production ]; then
    cp deployment/env/.env.production.example \
       deployment/env/.env.production
fi

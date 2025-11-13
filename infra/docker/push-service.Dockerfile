
FROM php:8.2-fpm
WORKDIR /var/www/html

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql pdo_pgsql

# Copy composer dependencies first
COPY ./composer.json ./composer.lock ./
RUN apt-get update && apt-get install -y unzip git && \
    curl -sS https://getcomposer.org/installer | php && \
    php composer.phar install --no-dev --optimize-autoloader

# Copy source
COPY . .

EXPOSE 9000
CMD ["php-fpm"]


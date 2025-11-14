import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import CircuitBreaker from 'opossum';

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers: Map<string, CircuitBreaker> = new Map();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Create or get a circuit breaker for a service
   */
  getBreaker<T>(
    serviceName: string,
    fn: (...args: any[]) => Promise<T>,
    fallback?: (...args: any[]) => Promise<T>,
  ): CircuitBreaker<T> {
    const key = serviceName;

    if (this.breakers.has(key)) {
      return this.breakers.get(key) as CircuitBreaker<T>;
    }

    const options: CircuitBreakerOptions = {
      timeout: this.configService.get<number>(
        `CIRCUIT_BREAKER_${serviceName.toUpperCase()}_TIMEOUT`,
        5000,
      ),
      errorThresholdPercentage: this.configService.get<number>(
        `CIRCUIT_BREAKER_${serviceName.toUpperCase()}_ERROR_THRESHOLD`,
        50,
      ),
      resetTimeout: this.configService.get<number>(
        `CIRCUIT_BREAKER_${serviceName.toUpperCase()}_RESET_TIMEOUT`,
        30000,
      ),
      rollingCountTimeout: this.configService.get<number>(
        `CIRCUIT_BREAKER_${serviceName.toUpperCase()}_ROLLING_TIMEOUT`,
        60000,
      ),
      rollingCountBuckets: this.configService.get<number>(
        `CIRCUIT_BREAKER_${serviceName.toUpperCase()}_BUCKETS`,
        10,
      ),
    };

    const breaker = new CircuitBreaker(fn, options);

    if (fallback) {
      breaker.fallback(fallback);
    }

    // Event listeners
    breaker.on('open', () => {
      this.logger.warn(`Circuit breaker for ${serviceName} is now OPEN`);
    });

    breaker.on('halfOpen', () => {
      this.logger.log(
        `Circuit breaker for ${serviceName} is now HALF-OPEN (testing connection)`,
      );
    });

    breaker.on('close', () => {
      this.logger.log(
        `Circuit breaker for ${serviceName} is now CLOSED (healthy)`,
      );
    });

    breaker.on('failure', (error: Error) => {
      this.logger.warn(
        `Circuit breaker for ${serviceName} recorded a failure: ${error.message}`,
      );
    });

    breaker.on('reject', (error: Error) => {
      this.logger.error(
        `Circuit breaker for ${serviceName} rejected request: ${error.message}`,
      );
    });

    this.breakers.set(key, breaker);
    return breaker;
  }

  /**
   * Get circuit breaker status
   */
  getStatus(serviceName: string): {
    enabled: boolean;
    state: string;
    stats: any;
  } | null {
    const breaker = this.breakers.get(serviceName);
    if (!breaker) {
      return null;
    }

    return {
      enabled: true,
      state: breaker.status?.state || 'unknown',
      stats: breaker.stats,
    };
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    this.breakers.forEach((breaker, serviceName) => {
      statuses[serviceName] = {
        state: breaker.status?.state || 'unknown',
        stats: breaker.stats,
      };
    });
    return statuses;
  }
}

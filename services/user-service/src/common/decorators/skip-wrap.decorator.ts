import { SetMetadata } from '@nestjs/common';

export const SKIP_WRAP = 'skipWrap';
export const SkipWrap = () => SetMetadata(SKIP_WRAP, true);


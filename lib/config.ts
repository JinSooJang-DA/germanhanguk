/**
 * GermanHanguk Centralized Configuration
 * 
 * NEXT_PUBLIC_SITE_URL 환경변수를 기반으로 프로덕션/개발 환경에 맞는 사이트의 퍼블릭 Base URL을 결정합니다.
 * 환경변수가 지정되지 않은 경우 로컬 개발 서버 주소인 http://localhost:3000 을 기본 폴백으로 사용합니다.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * @file property.schema.ts
 * @description 매물 입력 폼 검증 스키마(zod).
 */
import { z } from "zod";

/** 1~5 점수 입력 스키마 */
const ratingSchema = z
  .number({ invalid_type_error: "숫자 점수만 입력할 수 있어요." })
  .int()
  .min(1)
  .max(5)
  .nullable();

export const propertyFormSchema = z
  .object({
    source_url: z.string().url("네이버 부동산 링크를 넣어주세요."),
    title: z.string().min(1, "제목을 입력해주세요."),
    deal_type: z.string().min(1, "거래유형을 입력해주세요."),
    address: z.string().min(1, "주소를 입력해주세요."),
    current_price_value: z.number().positive().nullable(),
    desired_price_value: z.number().positive().nullable(),
    visited: z.boolean(),
    visited_at: z.string(),
    rating_location: ratingSchema,
    rating_price: ratingSchema,
    rating_condition: ratingSchema,
    rating_sunlight: ratingSchema,
    rating_environment: ratingSchema,
    pros: z.string(),
    cons: z.string(),
    memo: z.string(),
    decision_status: z.enum(["review", "hold", "exclude", "revisit"]),
    thumbnail_url: z.string(),
  })
  .superRefine((value, context) => {
    if (value.visited && !value.visited_at) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["visited_at"],
        message: "방문했으면 방문일을 꼭 기록해주세요.",
      });
    }
  });

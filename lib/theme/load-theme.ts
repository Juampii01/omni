import { hexToHsl } from "./hex-to-hsl"
import { BRAND_COLOR_HEX } from "@/lib/constants"

export interface ClientTheme {
  brandColor: string      // hex
  businessName: string
  logoUrl: string | null
}

export interface ThemeCssVars {
  brand: string           // HSL string  e.g. "163 47% 28%"
  brandHover: string
  brandSoft: string
}

export function buildThemeCssVars(brandHex: string): ThemeCssVars {
  const brandHsl = hexToHsl(brandHex)

  // Derive hover (10% darker) and soft (94% lightness) from brand
  const [h, s] = brandHsl.split(" ")
  const brandHover = `${h} ${s} 20%`
  const brandSoft  = `${h} ${parseInt(s) - 10}% 94%`

  return { brand: brandHsl, brandHover, brandSoft }
}

export function themeToCss(vars: ThemeCssVars): string {
  return `
    --brand: ${vars.brand};
    --brand-hover: ${vars.brandHover};
    --brand-soft: ${vars.brandSoft};
    --primary: ${vars.brand};
    --ring: ${vars.brand};
  `
}

export const DEFAULT_THEME: ThemeCssVars = buildThemeCssVars(BRAND_COLOR_HEX)

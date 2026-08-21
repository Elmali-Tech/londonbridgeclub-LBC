import { NextResponse } from "next/server";
import { callLbcEndpoint, getLbcRows } from "@/lib/lbc-api";
import { getAssetPublicUrl, getLegacyS3PublicUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

type BusinessRow = {
  id?: string | number;
  name?: string | null;
  website_url?: string | null;
  logo_key?: string | null;
  logo_url?: string | null;
  created_at?: string | null;
  type?: string | null;
};

const logoUrl = (business: BusinessRow) =>
  business.logo_url ||
  (business.logo_key
    ? getAssetPublicUrl(business.logo_key) ||
      getLegacyS3PublicUrl(business.logo_key)
    : "");

export async function GET() {
  const result = await callLbcEndpoint("/businesses", {
    extraBody: { type: "partner" },
  });
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "LBC businesses endpoint is unavailable",
        code: result.bodyError?.code || "LBC_BUSINESSES_UNAVAILABLE",
      },
      { status: result.status >= 400 ? result.status : 502 },
    );
  }

  const partners = getLbcRows<BusinessRow>(result.data)
    .filter((business) =>
      (business.type || "partner").toLocaleLowerCase("tr-TR").includes("partner"),
    )
    .map((business) => ({
      id: business.id,
      name: business.name || "LBC Partner",
      websiteUrl: business.website_url || null,
      logoKey: business.logo_key || null,
      logoUrl: logoUrl(business),
      createdAt: business.created_at || null,
    }));

  return NextResponse.json({
    success: true,
    partners,
    dataSource: { primary: "lbc-api", endpoint: "/businesses" },
  });
}

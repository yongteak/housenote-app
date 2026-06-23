import LZString from "lz-string";

export function buildArticleDetailMapUrl(params: {
  articleId: string;
  center: string;
  zoom: string;
}): string {
  const layerPayload = [
    {
      id: "article_detail",
      params: { articleId: params.articleId },
      searchParams: { zoom: params.zoom },
    },
  ];
  const layer = LZString.compressToBase64(JSON.stringify(layerPayload));
  const url = new URL("https://fin.land.naver.com/map");
  url.searchParams.set("center", params.center);
  url.searchParams.set("zoom", params.zoom);
  url.searchParams.set("layer", layer);
  return url.toString();
}

export function readMapUrlCoords(mapUrl: string): { center: string; zoom: string } {
  const parsed = new URL(mapUrl);
  return {
    center: parsed.searchParams.get("center") ?? "3zkSCi-2APDAy",
    zoom: parsed.searchParams.get("zoom") ?? "15",
  };
}

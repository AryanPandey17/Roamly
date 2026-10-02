import { fileSlug, itineraryToIcs } from "@/server/export";
import { ApiError, notFound, requireUuid, withUser } from "@/server/http";
import { getTripDetail } from "@/server/trips";

/** Downloads the itinerary as markdown (?format=md) or a calendar file (?format=ics). */
export const GET = withUser<{ params: Promise<{ id: string }> }>(async ({ request, context }) => {
  const id = requireUuid((await context.params).id, "Trip");
  const format = new URL(request.url).searchParams.get("format");

  const detail = await getTripDetail(id); // RLS: owner only
  if (!detail?.itinerary) throw notFound("Itinerary");
  const name = fileSlug(detail.trip.title);

  if (format === "md") {
    return new Response(detail.itinerary.summary_markdown ?? "", {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}.md"`,
      },
    });
  }
  if (format === "ics") {
    return new Response(itineraryToIcs(detail.trip.title, detail.days, detail.items), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}.ics"`,
      },
    });
  }
  throw new ApiError(400, "bad_format", "Use format=md or format=ics.");
});

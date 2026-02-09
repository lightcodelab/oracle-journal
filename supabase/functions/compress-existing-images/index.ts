import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".bmp", ".tiff"];
const QUALITY = 60;
const MAX_DIM = 1920;

// Buckets that contain admin-uploaded images
const BUCKETS = [
  "content-images",
  "healing-content",
  "healing-resource-images",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check – admin only
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse optional body for dry-run or specific bucket
    let dryRun = false;
    let targetBuckets = BUCKETS;
    try {
      const body = await req.json();
      dryRun = body.dryRun === true;
      if (body.buckets && Array.isArray(body.buckets)) {
        targetBuckets = body.buckets.filter((b: string) =>
          BUCKETS.includes(b)
        );
      }
    } catch {
      // No body is fine
    }

    const results: {
      bucket: string;
      file: string;
      originalSize: number;
      compressedSize: number;
      status: string;
    }[] = [];
    let skipped = 0;
    let errors = 0;

    for (const bucket of targetBuckets) {
      console.log(`Processing bucket: ${bucket}`);

      // List all files in bucket
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from(bucket)
        .list("", { limit: 1000 });

      if (listError) {
        console.error(`Error listing ${bucket}:`, listError.message);
        errors++;
        continue;
      }

      if (!files || files.length === 0) {
        console.log(`No files in ${bucket}`);
        continue;
      }

      for (const file of files) {
        // Skip folders
        if (!file.name || file.metadata === null) continue;

        const ext = "." + file.name.split(".").pop()?.toLowerCase();

        // Skip already-webp files and non-image files
        if (ext === ".webp") {
          skipped++;
          continue;
        }

        if (!IMAGE_EXTENSIONS.includes(ext)) {
          skipped++;
          continue;
        }

        console.log(`Processing: ${bucket}/${file.name} (${file.metadata?.size ?? "?"} bytes)`);

        if (dryRun) {
          results.push({
            bucket,
            file: file.name,
            originalSize: file.metadata?.size ?? 0,
            compressedSize: 0,
            status: "would_compress",
          });
          continue;
        }

        try {
          // Download the file
          const { data: fileData, error: dlError } =
            await supabaseAdmin.storage.from(bucket).download(file.name);

          if (dlError || !fileData) {
            console.error(`Download error ${file.name}:`, dlError?.message);
            errors++;
            continue;
          }

          const originalSize = fileData.size;

          // Use sharp-like approach via ImageMagick/canvas isn't available in Deno edge.
          // Instead we'll use the built-in ImageBitmap + OffscreenCanvas approach.
          // Note: Deno Deploy does NOT support OffscreenCanvas.
          // Alternative: re-encode using a Wasm-based encoder or simply
          // use fetch to a compression service. For simplicity, we'll use
          // the browser-compatible approach with a lightweight wasm solution.

          // Since Deno edge functions don't have canvas/image processing,
          // we'll re-upload the image in a format conversion approach using
          // a third-party image compression library.
          
          // Practical approach: Use the `imagescript` Deno library for processing
          const { Image } = await import("https://deno.land/x/imagescript@1.3.0/mod.ts");
          
          const arrayBuffer = await fileData.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          
          let img;
          try {
            img = await Image.decode(uint8);
          } catch (decodeErr) {
            console.error(`Cannot decode ${file.name}:`, decodeErr);
            skipped++;
            continue;
          }

          // Resize if needed
          const { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
            const newW = Math.round(width * ratio);
            const newH = Math.round(height * ratio);
            img.resize(newW, newH);
          }

          // Encode as PNG (imagescript doesn't support webp output, but we get resize benefit)
          // We'll encode as JPEG with quality for significant compression
          const compressed = await img.encodeJPEG(QUALITY);
          const compressedSize = compressed.length;

          // Only re-upload if actually smaller
          if (compressedSize >= originalSize) {
            console.log(`Skipping ${file.name}: compressed not smaller`);
            skipped++;
            continue;
          }

          const baseName = file.name.replace(/\.[^.]+$/, "");
          const newName = `${baseName}.jpg`;

          // Upload compressed version
          const { error: uploadError } = await supabaseAdmin.storage
            .from(bucket)
            .upload(newName, compressed, {
              contentType: "image/jpeg",
              upsert: true,
            });

          if (uploadError) {
            console.error(`Upload error ${newName}:`, uploadError.message);
            errors++;
            continue;
          }

          // If the new filename differs from the old, remove the old file
          if (newName !== file.name) {
            await supabaseAdmin.storage.from(bucket).remove([file.name]);
          }

          const reduction = Math.round((1 - compressedSize / originalSize) * 100);
          console.log(
            `Compressed ${file.name}: ${originalSize} → ${compressedSize} bytes (${reduction}% reduction)`
          );

          results.push({
            bucket,
            file: file.name,
            originalSize,
            compressedSize,
            status: `compressed_${reduction}%`,
          });
        } catch (fileErr) {
          console.error(`Error processing ${file.name}:`, fileErr);
          errors++;
        }
      }
    }

    const totalOriginal = results.reduce((s, r) => s + r.originalSize, 0);
    const totalCompressed = results.reduce((s, r) => s + r.compressedSize, 0);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        summary: {
          filesProcessed: results.length,
          filesSkipped: skipped,
          errors,
          totalOriginalBytes: totalOriginal,
          totalCompressedBytes: totalCompressed,
          totalSavedBytes: totalOriginal - totalCompressed,
          overallReduction: totalOriginal > 0 
            ? `${Math.round((1 - totalCompressed / totalOriginal) * 100)}%` 
            : "0%",
        },
        details: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

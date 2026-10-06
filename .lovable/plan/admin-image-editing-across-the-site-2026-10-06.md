# Admin Image Editing Across the Site

## Goal

Give signed-in admins a small edit icon in the top-right corner of content artwork. Selecting it opens one consistent replacement flow, updates the image everywhere it appears, and leaves the page unchanged for members.

Included: banners, Door artwork, course and resource thumbnails, and page photography.

Excluded: logos, icons, oracle card faces and backs, images inside rich-text bodies, decorative textures, and private member uploads.

## Implementation

1. **Create a central image catalogue**
   - Add a protected site-image record keyed by a stable name for artwork that is currently fixed in the app.
   - Allow public/member reads where the artwork is already visible, but restrict changes to admins in the database.
   - Keep each existing image as the fallback, so no current artwork disappears during rollout.

2. **Build the admin image control**
   - Add a reusable image wrapper that renders exactly like the current image for everyone except admins.
   - For admins, show a compact top-right edit icon on hover and keyboard focus.
   - Open a replacement dialog that supports uploading a compressed image or selecting an existing image from the image library.
   - Show progress, success, and failure feedback; retain the old image if saving fails.

3. **Connect images to their correct source**
   - Fixed page artwork saves to the central catalogue.
   - Course and resource images update their existing content record rather than creating duplicate settings.
   - Refresh the visible image immediately after a successful change so the admin can see the result in place.

4. **Roll out to content artwork**
   - Apply the control to the four Door thumbnails and Door/page headers.
   - Apply it to sales/member-page banners and page photography.
   - Apply it to course and resource thumbnails wherever their source record can be identified safely.
   - Do not place controls over images that are excluded or lack an unambiguous editable source.

5. **Verify permissions and presentation**
   - Confirm admins can replace each supported image type from the page where it appears.
   - Confirm members and free accounts never see editing controls and cannot change images directly.
   - Check desktop and mobile layouts, keyboard access, upload errors, image cropping, and current page links.

## Technical details

- Reuse the existing image compression and image-library controls.
- Use server-enforced admin permissions; the visible admin icon is not the security boundary.
- Store stable image keys rather than page positions, so layout changes do not break saved artwork.
- Preserve semantic image descriptions and existing aspect ratios/cropping.
- Roll out through a shared component rather than attempting to alter every image in the browser automatically.

## Result

Admins can replace supported content artwork directly from the live page. Existing dedicated editors remain responsible for card artwork and rich-text images, while private member media remains untouched.
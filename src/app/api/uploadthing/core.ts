import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({
    image: {
      maxFileSize: "64MB",
      maxFileCount: 1,
    },
  })
    // Set permissions and filetypes for this FileRoute
    .middleware(async () => {
      // This code runs on your server before upload
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      // This code runs on your server after upload
      console.log("Upload complete for file:", file.ufsUrl || file.url);
      return { url: file.ufsUrl || file.url, key: file.key };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;


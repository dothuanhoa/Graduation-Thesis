import { Editor } from "@tinymce/tinymce-react";
import { notificationImageApi } from "../services/api";
import "tinymce/tinymce";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/models/dom/model";
import "tinymce/plugins/advlist";
import "tinymce/plugins/autolink";
import "tinymce/plugins/charmap";
import "tinymce/plugins/code";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/image";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/preview";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/table";
import "tinymce/plugins/wordcount";
import "tinymce/skins/content/default/content.css";
import "tinymce/skins/ui/oxide/content.css";
import "tinymce/skins/ui/oxide/skin.css";

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]);

const escapeHtmlAttribute = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const extensionFromImageType = (type: string) => {
  const normalizedType = type.toLowerCase();
  if (normalizedType === "image/jpeg" || normalizedType === "image/jpg" || normalizedType === "image/pjpeg") return "jpg";
  if (normalizedType === "image/png" || normalizedType === "image/x-png") return "png";
  if (normalizedType === "image/gif") return "gif";
  if (normalizedType === "image/webp") return "webp";
  return "png";
};

const normalizeImageFile = (file: File, fallbackName = "notification-image") => {
  const extension = extensionFromImageType(file.type || "image/png");
  const hasExtension = /\.(jpe?g|png|gif|webp)$/i.test(file.name);
  const rawName = file.name?.trim() || fallbackName;
  const fileName = hasExtension ? rawName : `${rawName}.${extension}`;
  const type = file.type || (extension === "jpg" ? "image/jpeg" : `image/${extension}`);

  return new File([file], fileName, { type });
};

const uploadImageFile = async (file: File) => {
  const response = await notificationImageApi.upload(normalizeImageFile(file));
  return response.location || response.fileUrl;
};

type RichTextEditorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  hint?: string;
  required?: boolean;
};

function RichTextEditor({
  label,
  value,
  onChange,
  className = "",
  disabled = false,
  hint,
  required = false,
}: RichTextEditorProps) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-semibold text-on-surface">
        {label}
        {required && <span className="text-error"> *</span>}
      </span>
      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
        <Editor
          disabled={disabled}
          licenseKey="gpl"
          tinymceScriptSrc={[]}
          onEditorChange={(content) => onChange(content)}
          value={value}
          init={{
            height: 360,
            menubar: false,
            branding: false,
            promotion: false,
            skin: false,
            content_css: false,
            entity_encoding: "raw",
            plugins: "advlist autolink charmap code fullscreen image link lists preview searchreplace table wordcount",
            toolbar:
              "undo redo | blocks | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image table | removeformat | preview code fullscreen",
            block_formats: "Đoạn văn=p;Tiêu đề 2=h2;Tiêu đề 3=h3;Trích dẫn=blockquote",
            contextmenu: "link image table",
            default_link_target: "_blank",
            link_assume_external_targets: "https",
            automatic_uploads: true,
            paste_data_images: true,
            block_unsupported_drop: true,
            file_picker_types: "image",
            images_file_types: "jpeg,jpg,png,gif,webp",
            image_caption: true,
            image_uploadtab: true,
            images_upload_handler: async (blobInfo) => {
              try {
                const blob = blobInfo.blob();
                const fallbackExtension = extensionFromImageType(blob.type || "image/png");
                const rawFileName = blobInfo.filename() || `notification-image.${fallbackExtension}`;
                const fileName = rawFileName.includes(".") ? rawFileName : `${rawFileName}.${fallbackExtension}`;
                const file = new File([blob], fileName, { type: blob.type || "image/png" });
                return uploadImageFile(file);
              } catch (error) {
                const message = error instanceof Error ? error.message : "Không tải được ảnh thông báo.";
                throw new Error(message, { cause: error });
              }
            },
            setup: (editor) => {
              editor.on("dragover dragenter", (event) => {
                const dataTransfer = event.dataTransfer as DataTransfer | undefined;
                const items = Array.from(dataTransfer?.items ?? []);
                if (items.some((item) => item.kind === "file" && item.type.startsWith("image/"))) {
                  event.preventDefault();
                }
              });

              editor.on("drop", async (event) => {
                const dataTransfer = event.dataTransfer as DataTransfer | undefined;
                const droppedFiles = Array.from(dataTransfer?.files ?? []).filter((file) =>
                  SUPPORTED_IMAGE_TYPES.has(file.type.toLowerCase()),
                );

                if (droppedFiles.length === 0) {
                  return;
                }

                event.preventDefault();
                event.stopPropagation();
                editor.setProgressState(true);

                try {
                  for (const file of droppedFiles) {
                    const imageUrl = await uploadImageFile(file);
                    const altText = escapeHtmlAttribute(file.name.replace(/\.[^/.]+$/, "") || "Ảnh thông báo");
                    editor.insertContent(`<p><img src="${escapeHtmlAttribute(imageUrl)}" alt="${altText}" /></p>`);
                  }
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Không tải được ảnh thông báo.";
                  editor.notificationManager.open({ text: message, type: "error" });
                } finally {
                  editor.setProgressState(false);
                }
              });
            },
            placeholder: "Nhập nội dung thông báo...",
            content_style:
              "body { font-family: Inter, Arial, sans-serif; font-size: 14px; color: #151c27; line-height: 1.7; } a { color: #003399; } table { border-collapse: collapse; width: 100%; } table td, table th { border: 1px solid #c7cfe4; padding: 8px; } blockquote { border-left: 4px solid #c7cfe4; margin-left: 0; padding-left: 12px; color: #4b5565; } img { max-width: 100%; height: auto; border-radius: 8px; }",
          }}
        />
      </div>
      {hint && <span className="text-xs text-on-surface-variant">{hint}</span>}
    </label>
  );
}

export default RichTextEditor;
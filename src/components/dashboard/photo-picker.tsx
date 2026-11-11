"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Preview {
  readonly key: string;
  readonly name: string;
  readonly url: string;
  readonly tooLarge: boolean;
}

interface PhotoPickerProps {
  readonly label: string;
  readonly error?: string;
  readonly maxBytes: number;
  /** How many more photos this product can take. */
  readonly maxFiles: number;
}

const BYTES_PER_MB = 1024 * 1024;

/** File input for product photos that shows a thumbnail of each chosen file before the form is saved. */
export function PhotoPicker({ label, error, maxBytes, maxFiles }: PhotoPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<readonly Preview[]>([]);

  // Free the previous thumbnails whenever the selection changes or the form goes away.
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  const show = (files: readonly File[]): void => {
    setPreviews(files.map((file, index) => ({ key: `${index}-${file.name}-${file.size}`, name: file.name, url: URL.createObjectURL(file), tooLarge: file.size > maxBytes })));
  };

  const removeAt = (index: number): void => {
    const element = input.current;
    if (!element?.files) return;
    const kept = [...element.files].filter((_, i) => i !== index);
    const transfer = new DataTransfer();
    kept.forEach((file) => transfer.items.add(file));
    element.files = transfer.files;
    show(kept);
  };

  const tooMany = previews.length > maxFiles;
  const anyTooLarge = previews.some((preview) => preview.tooLarge);
  const problem = tooMany
    ? `You can add ${maxFiles} more ${maxFiles === 1 ? "photo" : "photos"}. Remove ${previews.length - maxFiles} to continue.`
    : anyTooLarge
      ? `Photos must be ${Math.round(maxBytes / BYTES_PER_MB)} MB or smaller. Remove the ones marked in red.`
      : null;

  return (
    <div>
      <label htmlFor="images" className="field-label">{label}</label>
      <input
        ref={input}
        id="images"
        name="images"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="input file:mr-4 file:rounded-md file:border-0 file:bg-fg file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-white"
        aria-describedby={error ? "images-error" : problem ? "images-problem" : undefined}
        onChange={(event) => show([...(event.currentTarget.files ?? [])])}
      />
      {previews.length > 0 ? (
        <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6" aria-label="Photos ready to upload">
          {previews.map((preview, index) => (
            <li key={preview.key} className="animate-fade relative">
              <span className={`block aspect-square overflow-hidden rounded-xl border-2 bg-muted ${preview.tooLarge ? "border-danger" : "border-line"}`}>
                {/* A local preview of a file that has not been uploaded yet, so the image optimiser cannot be used. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.url} alt={`New photo ${index + 1}: ${preview.name}`} className="h-full w-full object-cover" />
              </span>
              <button
                type="button"
                className="absolute -right-1.5 -top-1.5 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-fg text-white shadow-sm transition-transform hover:scale-110"
                aria-label={`Remove ${preview.name}`}
                onClick={() => removeAt(index)}
              >
                <X size={13} aria-hidden="true" />
              </button>
              <span className={`mt-1 block truncate text-[12px] ${preview.tooLarge ? "font-semibold text-danger" : "text-subtle"}`}>{preview.tooLarge ? "Too large" : "Ready to upload"}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {problem ? <p id="images-problem" role="alert" className="mt-2 text-[13px] font-medium text-danger">{problem}</p> : null}
      {error ? <p id="images-error" role="alert" className="mt-1.5 text-[13px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}

import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";

export function useFormDraft(
  form: UseFormReturn<any>,
  key: string,
  onRestore?: (data: any) => void
) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState<any>(null);

  // Check for existing draft on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Object.keys(parsed).length > 0) {
          setHasDraft(true);
          setDraftData(parsed);
        }
      } catch (e) {
        console.error("Failed to parse form draft:", e);
      }
    }
  }, [key]);

  // Watch for form changes and save draft
  const watchedValues = form.watch();
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Save to localStorage if the form is dirty
    const isDirty = form.formState.isDirty;
    if (isDirty && watchedValues && Object.keys(watchedValues).length > 0) {
      localStorage.setItem(key, JSON.stringify(watchedValues));
      setHasDraft(true);
      setDraftData(watchedValues);
    }
  }, [watchedValues, key, form.formState.isDirty]);

  // Restore the saved draft values into react-hook-form
  const restoreDraft = () => {
    if (draftData) {
      Object.entries(draftData).forEach(([field, value]) => {
        form.setValue(field as any, value, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true
        });
      });
      if (onRestore) onRestore(draftData);
      setHasDraft(false);
    }
  };

  // Start fresh and reset the form
  const clearDraft = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
    setHasDraft(false);
    setDraftData(null);
    form.reset();
  };

  return { hasDraft, restoreDraft, clearDraft, draftData };
}

"use client";

import { Lightbulb } from "lucide-react";
import { useActionState, useState } from "react";
import { TextAreaField, TextField } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { showToast } from "@/components/ui/toast";
import { updateShipmentAction } from "@/lib/actions/vendor-orders";
import type { VendorOrder } from "@/lib/db/schema";
import { nextStatuses, type FulfillmentStatus } from "@/lib/domain/fulfillment";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form-state";

const ACTION_LABELS: Readonly<Partial<Record<FulfillmentStatus, string>>> = {
  accepted: "Accept order",
  packed: "Mark as packed",
  shipped: "Mark as shipped",
  delivered: "Mark as delivered",
};

const NEXT_STEP_HELP: Readonly<Record<FulfillmentStatus, string>> = {
  new: "Accept the order to confirm you can fulfil it.",
  accepted: "Pack the order, enter the package details below, then mark it as packed.",
  packed: "Hand the package to your carrier, add the tracking number, then mark it as shipped.",
  shipped: "Mark it as delivered once the carrier confirms delivery.",
  delivered: "This shipment is complete.",
  cancelled: "This shipment was cancelled.",
};

/** Runs the update and confirms success with a toast, which survives the page refreshing underneath it. */
async function updateAndConfirm(previous: FormState, formData: FormData): Promise<FormState> {
  const result = await updateShipmentAction(previous, formData);
  if (result.ok && result.message) showToast({ message: result.message });
  return result;
}

export function ShipmentForm({ shipment }: { shipment: VendorOrder }) {
  const [state, action] = useActionState(updateAndConfirm, EMPTY_FORM_STATE);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const forward = nextStatuses(shipment.status).filter((s) => s !== "cancelled");
  const canCancel = nextStatuses(shipment.status).includes("cancelled");
  const packageEditable = shipment.status === "new" || shipment.status === "accepted" || shipment.status === "packed";
  const closed = shipment.status === "delivered" || shipment.status === "cancelled";
  const errors = state.fieldErrors ?? {};
  const value = (n: number | null): string => (n === null ? "" : String(n));

  return (
    <form action={action} className="panel">
      <input type="hidden" name="vendorOrderId" value={shipment.id} />
      <div className="flex items-start gap-3 border-b border-line bg-brand-soft px-5 py-4 text-brand-dark">
        <Lightbulb size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-[14.5px] font-medium"><span className="font-bold">Next step:</span> {NEXT_STEP_HELP[shipment.status]}</p>
      </div>

      <fieldset className="space-y-5 p-5" disabled={closed}>
        <legend className="sr-only">Package and shipping details</legend>
        <div>
          <h3 className="text-[17px] font-bold tracking-tight">Package details</h3>
          <p className="mt-0.5 text-[14px] text-subtle">The outer box as you will hand it to the carrier. Required before packing.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <TextField label="Packages" name="packageCount" type="number" inputMode="numeric" min={1} max={50} defaultValue={value(shipment.packageCount)} readOnly={!packageEditable} error={errors.packageCount} />
          <TextField label="Weight (g)" name="weightGrams" type="number" inputMode="numeric" min={1} defaultValue={value(shipment.weightGrams)} readOnly={!packageEditable} error={errors.weightGrams} />
          <TextField label="Length (cm)" name="lengthCm" type="number" inputMode="numeric" min={1} defaultValue={value(shipment.lengthCm)} readOnly={!packageEditable} error={errors.lengthCm} />
          <TextField label="Width (cm)" name="widthCm" type="number" inputMode="numeric" min={1} defaultValue={value(shipment.widthCm)} readOnly={!packageEditable} error={errors.widthCm} />
          <TextField label="Height (cm)" name="heightCm" type="number" inputMode="numeric" min={1} defaultValue={value(shipment.heightCm)} readOnly={!packageEditable} error={errors.heightCm} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Carrier" name="carrier" maxLength={60} defaultValue={shipment.carrier ?? ""} placeholder="e.g. DHL, SF Express" error={errors.carrier} />
          <TextField label="Tracking number" name="trackingNumber" maxLength={60} defaultValue={shipment.trackingNumber ?? ""} error={errors.trackingNumber} />
        </div>
        <TextAreaField label="Note (optional, shown to the customer)" name="vendorNote" maxLength={500} defaultValue={shipment.vendorNote ?? ""} error={errors.vendorNote} />
      </fieldset>

      <div className="space-y-4 border-t border-line p-5">
        <FormMessage state={state} />
        {closed ? null : (
          <div className="flex flex-wrap items-center gap-3">
            {forward.map((status) => (
              <SubmitButton key={status} name="intent" value={status} className="btn btn-primary" pendingLabel="Saving…">
                {ACTION_LABELS[status] ?? status}
              </SubmitButton>
            ))}
            <SubmitButton name="intent" value="save" className="btn btn-ghost" pendingLabel="Saving…">Save details</SubmitButton>
            {!canCancel ? null : confirmingCancel ? (
              <span className="animate-fade ml-auto flex flex-wrap items-center gap-2" role="group" aria-label="Confirm cancelling this shipment">
                <span className="text-[13.5px] font-semibold">Cancel this shipment? This cannot be undone.</span>
                <SubmitButton name="intent" value="cancelled" className="btn btn-sm bg-danger text-white hover:bg-[#a82222]" pendingLabel="Cancelling…">Yes, cancel it</SubmitButton>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmingCancel(false)}>Keep it</button>
              </span>
            ) : (
              <button type="button" className="ml-auto cursor-pointer rounded-lg px-3 py-2 text-[14px] font-medium text-danger transition-colors hover:bg-red-50" onClick={() => setConfirmingCancel(true)}>
                Cancel shipment
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  );
}

import { logUserEvent } from "../apis/api_LogUserEventHttpTrigger.js";

export async function submitUserEvent(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  const eventPayload = {
    LCID: "2ABC4D8D-689E-4F28-A5A8-00A4F2BA4AC2", //parseInt(formData.get("LCID") as string),
    ICID: "MCT0102",//parseInt(formData.get("ICID") as string),
    Event: "User went direct to lender", //parseInt(formData.get("user-event") as string),
    FieldName: "LenderName", //parseInt(formData.get("field-name") as string),
    FieldValue: "First Direct", //parseInt(formData.get("field-value") as string),
    CreatedBy: "MCT", //parseInt(formData.get("created-by") as string),
  };

  const result = await logUserEvent(eventPayload);

  if (result?.result?.status === "OK") {
    console.log("User event logged successfully");
  } else {
    console.log("Failed to log user event");
  }
}
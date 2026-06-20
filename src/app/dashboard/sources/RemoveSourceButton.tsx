"use client";

import Swal from "sweetalert2";

export function RemoveSourceButton({ sourceId }: { sourceId: string }) {
  async function handleRemove() {
    const result = await Swal.fire({
      title: "Remove permission?",
      text: "After removing it, you will need to connect and authorize again.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remove permission",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/connectors/disconnect";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "sourceId";
    input.value = sourceId;

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <button
      type="button"
      className="btn btn-ghost"
      style={{ color: "var(--red)" }}
      onClick={handleRemove}
    >
      Remove
    </button>
  );
}
// "use client";

// export function RemoveSourceButton({ sourceId }: { sourceId: string }) {
//   return (
//     <form
//       action="/api/connectors/disconnect"
//       method="POST"
//       onSubmit={(event) => {
//         const confirmed = window.confirm(
//           "Are you sure you want to remove this permission? After removing it, you will need to connect and authorize again."
//         );

//         if (!confirmed) {
//           event.preventDefault();
//         }
//       }}
//     >
//       <input type="hidden" name="sourceId" value={sourceId} />

//       <button className="btn btn-ghost" style={{ color: "var(--red)" }}>
//         Remove
//       </button>
//     </form>
//   );
// }
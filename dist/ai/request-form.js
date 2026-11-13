import { parseContact } from "../contact.js";
import { trackGoal } from "../analytics.js";

/**
 * @param {() => string[]} getSelected
 * @param {'ai' | 'infrastructure' | 'hardware'} [kind]
 * @param {() => {configuration?: import('../hardware/configuration.js').HardwareConfiguration | null}} [getExtra]
 * @returns {void}
 */
export function initializeRequestForm(getSelected, kind = "ai", getExtra = () => ({})) {
  const form = document.querySelector("#request-form");
  const submit = document.querySelector("#request-submit");
  const status = document.querySelector("#form-status");
  const contact = form.elements.namedItem("contact");
  let sending = false;

  contact.addEventListener("input", () => contact.setCustomValidity(""));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (sending) return;

    contact.setCustomValidity(parseContact(contact.value) ? "" : "Укажите телефон от 7 до 15 цифр или email, например name@company.ru.");

    if (!form.reportValidity()) return;

    const fields = new FormData(form);

    sending = true;
    submit.disabled = true;
    submit.textContent = "Отправляем…";
    form.setAttribute("aria-busy", "true");
    status.textContent = "";
    status.removeAttribute("data-state");

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({
          ...getExtra(),
          kind,
          company: "",
          deployment: "undecided",
          name: fields.get("name"),
          contact: fields.get("contact"),
          message: fields.get("message"),
          serviceIds: getSelected(),
        }),
      });
      const result = await response.json();

      if (!response.ok || result.ok !== true) {
        throw new Error(typeof result.error === "string" ? result.error : "Не удалось отправить заявку. Попробуйте ещё раз.");
      }

      status.dataset.state = "success";
      status.textContent = "Заявка отправлена. Свяжемся с вами по указанному контакту.";
      trackGoal("request_sent");
    } catch (error) {
      status.dataset.state = "error";
      status.textContent = error instanceof Error && error.name === "Error"
        ? error.message
        : "Не удалось подтвердить отправку. Попробуйте позже или позвоните нам: +7 (921) 115-31-43.";
    } finally {
      sending = false;
      submit.disabled = false;
      submit.textContent = "Отправить заявку";
      form.removeAttribute("aria-busy");
    }
  });
}

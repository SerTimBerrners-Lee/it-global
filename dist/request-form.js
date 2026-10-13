/**
 * @param {() => string[]} getSelected
 * @param {() => {before: number, plan: string, needsVds: boolean}} getCalculation
 * @returns {void}
 */
export function initializeRequestForm(getSelected, getCalculation) {
  const form = document.querySelector("#request-form");
  const submit = document.querySelector("#request-submit");
  const status = document.querySelector("#form-status");
  const phone = form.elements.namedItem("phone");
  let sending = false;

  phone.addEventListener("input", () => phone.setCustomValidity(""));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (sending) return;

    const phoneDigits = phone.value.replace(/\D/g, "");

    phone.setCustomValidity(
      phoneDigits.length >= 7 && phoneDigits.length <= 15
        ? ""
        : "Введите номер телефона от 7 до 15 цифр.",
    );

    if (!form.reportValidity()) return;

    const fields = new FormData(form);
    const calculation = getCalculation();

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
          name: fields.get("name"),
          phone: fields.get("phone"),
          message: fields.get("message"),
          serviceIds: getSelected(),
          calculation: {
            current: calculation.before,
            plan: calculation.plan,
            needsVds: calculation.needsVds,
          },
        }),
      });
      const result = await response.json();

      if (!response.ok || result.ok !== true) {
        throw new Error(typeof result.error === "string" ? result.error : "Не удалось отправить заявку. Попробуйте ещё раз.");
      }

      status.dataset.state = "success";
      status.textContent = "Заявка отправлена. Свяжемся с вами по указанному телефону.";
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

/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom/extend-expect";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import BillsUI from "../views/BillsUI.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
jest.mock("../app/store", () => mockStore);
import store from "../app/store";
import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
    // Simule local storage from a user employee
    beforeEach(() => {
        jest.spyOn(store, "bills");
        Object.defineProperty(window, "localStorage", {
            value: localStorageMock,
        });
        window.localStorage.setItem(
            "user",
            JSON.stringify({
                type: "Employee",
                email: "employee@test.tld",
            })
        );
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.append(root);
        router();
    });
    describe("When I am on NewBill Page", () => {
        test("Then bill icon in vertical layout should be highlighted", async () => {
            // if mail icon contain the class "active-icon", it means that the icon is highlighted
            window.onNavigate(ROUTES_PATH.NewBill);
            await waitFor(() => screen.getByTestId("icon-mail"));
            const mailIcon = screen.getByTestId("icon-mail");
            expect(mailIcon.classList.contains("active-icon")).toBe(true);
        });
        test("Then the New Bill form is rendered", () => {
            // Verify that the page and the form is rendered
            window.onNavigate(ROUTES_PATH.NewBill);
            expect(screen.getAllByText("Envoyer une note de frais"));
            expect(screen.getByTestId("form-new-bill")).toBeTruthy();
        });
    });
    describe("When I am on NewBill Page and I complete the form", () => {
        describe("When the file type is not accepted", () => {
            test("Then the file is not selected", async () => {
                // Verify that the file is not selected and the error message is displayed
                document.body.innerHTML = NewBillUI();
                new NewBill({ document, onNavigate, store: mockStore, localStorage });

                const fileInput = screen.getByTestId("file");
                const file = new File([""], "test.pdf", { type: "application/pdf" });
                const error = screen.getByTestId("error-file");

                userEvent.upload(fileInput, file);
                expect(error.textContent).toBe("Seul les fichiers .jpg, .jpeg, .png sont acceptés");
            });
        });
        describe("When the file type is accepted (jpg, jpeg, png)", () => {
            test("Then the file is selected", () => {
                // Verify that the file is selected and the error message is not displayed
                document.body.innerHTML = NewBillUI();
                new NewBill({ document, onNavigate, store: mockStore, localStorage });

                const fileInput = screen.getByTestId("file");
                const file = new File([""], "test.png", { type: "image/png" });
                const error = screen.getByTestId("error-file");

                userEvent.upload(fileInput, file);
                expect(error.textContent).toBe("");
            });
        });
    });
    describe("When the form is correct and I click on submit button", () => {
        test("Then my inputs should be valid", async () => {
            // Verify that all inputs are valid
            document.body.innerHTML = NewBillUI();
            const onNavigate = (pathname) => {
                document.body.innerHTML = ROUTES({ pathname });
            };
            const newBill = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage });

            const form = screen.getByTestId("form-new-bill");
            const inputType = screen.getByTestId("expense-type");
            const inputName = screen.getByTestId("expense-name");
            const inputDate = screen.getByTestId("datepicker");
            const inputAmount = screen.getByTestId("amount");
            const inputVat = screen.getByTestId("vat");
            const inputPct = screen.getByTestId("pct");
            const inputComment = screen.getByTestId("commentary");
            const inputFile = screen.getByTestId("file");
            const error = screen.getByTestId("error-file");

            const formData = {
                type: "Hôtel et logement",
                name: "Ibis Hotel",
                amount: 80,
                date: "2022-06-01",
                vat: "10",
                pct: 20,
                file: new File(["img"], "receipt.jpg", { type: "image/jpg" }),
                commentary: "...",
            };

            // Simulate the inputs completion
            fireEvent.change(inputType, { target: { value: formData.type } });
            fireEvent.change(inputName, { target: { value: formData.name } });
            fireEvent.change(inputAmount, { target: { value: formData.amount } });
            fireEvent.change(inputDate, { target: { value: formData.date } });
            fireEvent.change(inputVat, { target: { value: formData.vat } });
            fireEvent.change(inputPct, { target: { value: formData.pct } });
            userEvent.upload(inputFile, formData.file);
            fireEvent.change(inputComment, { target: { value: formData.commentary } });

            // Simulate the submit button click
            const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));

            form.addEventListener("submit", handleSubmit);
            fireEvent.submit(form);

            // Verify input validity and the error message for the file
            expect(inputType.validity.valid).toBeTruthy();
            expect(inputName.validity.valid).toBeTruthy();
            expect(inputDate.validity.valid).toBeTruthy();
            expect(inputAmount.validity.valid).toBeTruthy();
            expect(inputVat.validity.valid).toBeTruthy();
            expect(inputPct.validity.valid).toBeTruthy();
            expect(inputComment.validity.valid).toBeTruthy();
            expect(error.textContent).toBe("");

            // Check if submit function called and we are redirected to the bills page
            expect(handleSubmit).toHaveBeenCalled();
            expect(screen.getAllByText("Mes notes de frais")).toBeTruthy();
        });
    });
    describe("When an error occurs on API", () => {
        test("Then fetches bills from an API and fails with 404 message error", async () => {
            // Simulate an post error on API, verify that the error message is displayed
            mockStore.bills.mockImplementationOnce(() => { 
                return {
                    update: () => {
                        return Promise.reject(new Error("Erreur 404"));
                    },
                };
            });
            document.body.innerHTML = BillsUI({ error: "Erreur 404" });
            await new Promise(process.nextTick);
            const message = screen.getByText(/Erreur 404/);

            expect(message).toBeTruthy();
        });
        test("fetches messages from an API and fails with 500 message error", async () => {
            // Simulate an post error on API, verify that the error message is displayed
            mockStore.bills.mockImplementationOnce(() => {
                return {
                    update: () => {
                        return Promise.reject(new Error("Erreur 500"));
                    },
                };
            });
            document.body.innerHTML = BillsUI({ error: "Erreur 500" });
            await new Promise(process.nextTick);
            const message = screen.getByText(/Erreur 500/);

            expect(message).toBeTruthy();
        });
    });
});

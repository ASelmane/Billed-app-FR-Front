/* global process */
/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import Bills from "../containers/Bills.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import userEvent from "@testing-library/user-event";

import router from "../app/Router.js";
jest.mock("../app/Store", () => mockStore);

describe("Given I am connected as an employee", () => {
    // Simule local storage from a user employee
    beforeEach(() => {
        Object.defineProperty(window, "localStorage", {
            value: localStorageMock,
        });
        window.localStorage.setItem(
            "user",
            JSON.stringify({
                type: "Employee",
            })
        );
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.append(root);
        router();
    });
    describe("When I am on Bills Page", () => {
        test("Then bill icon in vertical layout should be highlighted", async () => {
            // if window icon contain the class "active-icon", it means that the icon is highlighted
            window.onNavigate(ROUTES_PATH.Bills);
            await waitFor(() => screen.getByTestId("icon-window"));
            const windowIcon = screen.getByTestId("icon-window");
            expect(windowIcon.classList.contains("active-icon")).toBe(true);
        });
        test("Then bills should be ordered from earliest to latest", () => {
            // test if bills are ordered from earliest to latest
            document.body.innerHTML = BillsUI({ data: bills });
            const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map((a) => a.innerHTML);
            const antiChrono = (a, b) => (a < b ? 1 : -1);
            const datesSorted = [...dates].sort(antiChrono);
            expect(dates).toEqual(datesSorted);
        });
    });
    describe("When I am on Bills Page and I click on New Bill", () => {
        test("Then, New Bill page appears", () => {
            // create the page Bills and try to click on the button New Bill
            // verify that the function handleClickNewBill is called
            const onNavigate = (pathname) => {
                document.body.innerHTML = ROUTES({ pathname });
            };
            document.body.innerHTML = BillsUI({ data: { bills } });
            const bill = new Bills({ document, onNavigate, store: null, localStorage });

            const btnNewBill = screen.getByTestId("btn-new-bill");
            const handleClickNewBill = jest.fn(bill.handleClickNewBill);

            btnNewBill.addEventListener("click", handleClickNewBill);
            userEvent.click(btnNewBill);
            expect(handleClickNewBill).toHaveBeenCalled();
        });
    });
    describe("When I am on Bills Page and I click on bill image button", () => {
        test("Then, bill image appear", () => {
            // create the page Bills and try to click on the button bill image
            // verify that the function handleClickBillImage is called
            const onNavigate = (pathname) => {
                document.body.innerHTML = ROUTES({ pathname });
            };
            document.body.innerHTML = BillsUI({ data: bills });
            const bill = new Bills({ document, onNavigate, mockStore, localStorage });

            const icon = screen.getAllByTestId("icon-eye")[0];
            jQuery.fn.modal = jest.fn();
            const handleClickIconEye = jest.fn(bill.handleClickIconEye(icon));

            icon.addEventListener("click", handleClickIconEye);
            userEvent.click(icon);
            expect(handleClickIconEye).toHaveBeenCalled();
        });
    });

    describe("When I navigate to Bills Page", () => {
        // Simule local storage from a user employee
        beforeEach(() => {
            jest.spyOn(mockStore, "bills");
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
            document.body.appendChild(root);
            router();
        });
        test("Then fetches bills from mock API GET", async () => {
            // verify the number of bills fetched from the mock API GET
            window.onNavigate(ROUTES_PATH.Bills);

            await waitFor(() => screen.getByText("Mes notes de frais"));
            const table = screen.getByTestId("tbody");
            
            expect(screen.getByText("Mes notes de frais")).toBeTruthy();
            expect(table.querySelectorAll("tr").length).toBe(4);
        });
        describe("When an error occurs on API", () => {
            test("Then fetches bills from an API and fails with 404 message error", async () => {
                // Simulate an error on API, verify that the error message is displayed
                mockStore.bills.mockImplementationOnce(() => {
                    return {
                        list: () => {
                            return Promise.reject(new Error("Erreur 404"));
                        },
                    };
                });

                window.onNavigate(ROUTES_PATH.Bills);
                await new Promise(process.nextTick);
                const message = await screen.getByText(/Erreur 404/);
                
                expect(message).toBeTruthy();
            });

            test("Then fetches messages from an API and fails with 500 message error", async () => {
                // Simulate an error on API, verify that the error message is displayed
                mockStore.bills.mockImplementationOnce(() => {
                    return {
                        list: () => {
                            return Promise.reject(new Error("Erreur 500"));
                        },
                    };
                });

                window.onNavigate(ROUTES_PATH.Bills);
                await new Promise(process.nextTick);
                const message = await screen.getByText(/Erreur 500/);

                expect(message).toBeTruthy();
            });
        });
    });
});

import Swal from "sweetalert2";
import { studio } from "../styles/index.jsx";

export const swal = Swal.mixin({
	background: studio.midnight,
	color: studio.text.primary,
	confirmButtonColor: studio.neon.violet,
	cancelButtonColor: studio.border,
	buttonsStyling: true,
	width: 520,
});

export const toast = swal.mixin({
	toast: true,
	position: "bottom-end",
	timer: 3000,
	timerProgressBar: true,
	showConfirmButton: false,
	didOpen: (toastEl) => {
		toastEl.addEventListener("mouseenter", Swal.stopTimer);
		toastEl.addEventListener("mouseleave", Swal.resumeTimer);
	},
});

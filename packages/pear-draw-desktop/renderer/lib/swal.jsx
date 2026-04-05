import Swal from "sweetalert2";
import { colors } from "../styles/common.jsx";

export const swal = Swal.mixin({
	background: colors.bgCard,
	color: colors.textPrimary,
	confirmButtonColor: colors.buttonPrimary,
	cancelButtonColor: colors.borderLight,
	buttonsStyling: true,
	width: 480,
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

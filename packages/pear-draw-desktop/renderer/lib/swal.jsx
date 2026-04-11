import Swal from "sweetalert2";
import { colors } from "../styles/common.jsx";

export const swal = Swal.mixin({
	background: colors.carbon,
	color: colors.snow,
	confirmButtonColor: colors.snow,
	cancelButtonColor: colors.granite,
	buttonsStyling: true,
	width: 480,
	heightAuto: false,
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
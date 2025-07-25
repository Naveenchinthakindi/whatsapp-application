import React, { useState } from "react";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import useLoginStore from "../../store/useLoginStore";
import useUserStore from "../../store/useUserStore";
import countries from "../../utils/Countries";
import useThemeStore from "../../store/themeStore";
import { FaChevronDown, FaUser, FaWhatsapp } from "react-icons/fa6";
import Spinner from "../../utils/Spinner";
import { sendOtp, verifyOtp } from "../../services/user.service";
import { toast } from "react-toastify";

const avatars = [
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe",
];

// Schema: phone or email must be provided
const loginValidationSchema = yup
  .object()
  .shape({
    phoneNumber: yup
      .string()
      .nullable() // Allows null
      .notRequired() // Optional field
      .transform((value, originalValue) =>
        originalValue?.trim() === "" ? null : value
      ) // Convert empty string to null
      .matches(/^\d+$/, "Phone number must contain only digits")
      .nullable(),

    email: yup
      .string()
      .nullable()
      .notRequired()
      .transform((value, originalValue) =>
        originalValue?.trim() === "" ? null : value
      )
      .email("Please enter a valid email"),
  })
  .test(
    "at-least-one",
    "Either phone number or email is required",
    function (value) {
      return !!(value?.phoneNumber || value?.email);
    }
  );

// Schema: OTP must be exactly 6 characters
const otpValidationSchema = yup.object().shape({
  otp: yup
    .string()
    .length(6, "Otp must be 6 digits")
    .required("Otp is required"),
});

// Schema: profile setup must have username + agreed checkbox
const profileValidationSchema = yup.object().shape({
  username: yup.string().required("username is required"),
  agreed: yup.bool().oneOf([true], "You must agree to the terms"),
});

const Login = () => {
  // Initial values for the login flow
  const initialFormValues = {
    phoneNumber: "",
    selectedCountry: countries[0],
    otp: ["", "", "", "", ""],
    email: "",
    profilePicture: null,
    avatar: avatars[0],
    profilePictureFile: null,
  };
  const { step, userPhoneData, setStep, setUserPhoneData, resetLoginState } =
    useLoginStore();

  const [formValues, setFormValues] = useState(initialFormValues);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropDown, setShowDropDown] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();

  //  Step 1: Email / Phone Form
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm({ resolver: yupResolver(loginValidationSchema) });

  // Step 2: OTP Form
  const {
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    setValue: setOtpValue,
  } = useForm({ resolver: yupResolver(otpValidationSchema) });

  // Step 3: Profile Setup Form
  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    watch, // Used for watching avatar, checkbox, etc.
  } = useForm({ resolver: yupResolver(profileValidationSchema) });

  const ProgressBar = () => (
    <div
      className={`w-full ${
        theme === "dark" ? "bg-gray-700" : "bg-gray-200"
      } rounded-full h-2.5 mb-6`}
    >
      <div
        className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `${(step / 3) * 100}%` }}
      ></div>
    </div>
  );

  const filterCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.includes(searchTerm)
  );

  const handleFormValue = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const loginSubmit = async () => {
    try {
      setLoading(true);
      console.log(formValues)
      if (formValues?.email) {
        const {email} = formValues;
        const response = await sendOtp(null, null, formValues.email);
        if (response.status === "success") {
          toast.info("OTP is send to your email");
          setUserPhoneData({ email });
          setStep(2);
        }
      } else {
        const response = await sendOtp(
          formValues.phoneNumber,
          formValues.selectedCountry.dialCode,
          null
        );
        if (response.status === "success") {
          toast.info("OTP send to your phone number");
          setUserPhoneData({ email });
          setStep(2);
        }
      }
    } catch (error) {
      console.error("loginSubmit error: ", error.message);
      setError(error.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const VerifyOtp = async () => {
    try {
      setLoading(true);
      if (!userPhoneData) {
        throw new Error("Phone or Email data is missing");
      }
      const otpString = formValues.otp.join("");
      let response;

      if (userPhoneData?.email) {
        response = await verifyOtp(null, null, userPhoneData.email, otpString);
      } else {
        response = await verifyOtp(
          userPhoneData.phoneNumber,
          userPhoneData.phoneSuffix,
          null,
          otpString
        );
      }

      if (response.status === "success") {
        const user = response.data?.user;

        toast.info("OTP verified successfully");
        setStep(3);
      }
    } catch (error) {
      console.error("verifyOTP error: ", error.message);
      setError(error.message || "Failed to verify otp");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-gray-900"
          : "bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4 overflow-hidden"
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transform={{ duration: 0.5 }}
        className={`${
          theme === "dark" ? "bg-gray-800 text-white" : "bg-white"
        } p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md relative z-10`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.2,
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className="w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center"
        >
          <FaWhatsapp className="w-16 h-16 text-white" />
        </motion.div>
        <h1
          className={`text-3xl font-bold text-center mb-6 ${
            theme === "dark" ? "text-white" : "text-gray-800"
          }`}
        >
          WhatsApp Login
        </h1>
        <ProgressBar />
        {step === 1 && (
          <form className="space-y-4" onSubmit={handleLoginSubmit(loginSubmit)}>
            <p
              className={`text-center ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Enter your phone number to receive OTP
            </p>
            <div className="relative">
              <div className="flex">
                <div className="relative w-1/3">
                  <button
                    type="button"
                    className={`flex-shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center ${
                      theme === "dark"
                        ? "text-white bg-gray-700 border-gray-600"
                        : "gray-900 bg-gray-100 border-gray-300"
                    } border rounded-s-lg hover:bg-gray-200 focus:right-4 focus:outline-none focus:ring-gray-100`}
                    onClick={() => setShowDropDown(!showDropDown)}
                  >
                    <span>
                      {formValues.selectedCountry?.flag}
                      {formValues.selectedCountry?.dialCode}
                    </span>
                    <FaChevronDown className="ml-2" />
                  </button>
                  {showDropDown && (
                    <div
                      className={`absolute z-10 w-full  mt-1 ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600"
                          : "bg-white border-gray-300"
                      } border rounded-md shadow-lg max-h-60 overflow-auto`}
                    >
                      <div
                        className={`sticky top-0 ${
                          theme === "dark" ? "bg-gray-700" : "bg-white"
                        } p-2`}
                      >
                        <input
                          type="text"
                          placeholder="Search countries..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`w-full px-2 py-1 ${
                            theme === "dark"
                              ? "bg-gray-600"
                              : "bg-white border-gray-300"
                          } rounded-md text-sm focus:outline-none focus:right-2 focus:ring-green-500`}
                        />
                      </div>
                      {filterCountries?.map((country) => (
                        <button
                          key={country.alpha2}
                          type="button"
                          className={`w-full text-left px-3 py-2 ${
                            theme === "dark"
                              ? "hover:bg-gray-600"
                              : "hover:bg-gray-100"
                          } focus:outline-none focus:bg-gray-100`}
                          onClick={() => {
                            setFormValues((prev) => ({
                              ...prev,
                              selectedCountry: country,
                            }));
                            setShowDropDown(false);
                          }}
                        >
                          {country?.flag} ({country?.dialCode}) {country?.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  name="phoneNumber"
                  value={formValues?.phoneNumber}
                  {...loginRegister("phoneNumber")}
                  onChange={handleFormValue}
                  placeholder="Phone Number"
                  className={`w-2/3 px-4 py-2 border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300"
                  } rounded-md text-sm focus:outline-none focus:right-2 focus:ring-green-500 ${
                    loginErrors.phoneNumber ? "border-red-500" : ""
                  }`}
                />
              </div>
              {loginErrors?.phoneNumber && (
                <p className="text-red-500 text-sm">
                  {loginErrors.phoneNumber.message}
                </p>
              )}
            </div>
            {/* divider with or */}
            <div className="flex items-center my-4">
              <div className="flex-grow h-px bg-gray-300" />
              <span className="mx-3 text-gray-500 text-sm font-medium">or</span>
              <div className="flex-grow h-px bg-gray-300" />
            </div>
            {/* Email input box */}
            <div
              className={`flex items-center border rounded-md px-3  ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600"
                  : "bg-white border-gray-300"
              }`}
            >
              <FaUser
                className={`mr-2 text-gray-400 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              />
              <input
                name="email"
                value={formValues?.email}
                {...loginRegister("email")}
                onChange={handleFormValue}
                placeholder="Email"
                className={`w-full px-4 py-2 bg-transparent focus:outline-none ${
                  theme === "dark" ? "text-white" : "bg-black"
                }  ${loginErrors.email ? "border-red-500" : ""}`}
              />
            </div>
            {loginErrors?.email && (
              <p className="text-red-500 text-sm">
                {loginErrors.email.message}
              </p>
            )}
            <button
              className={`w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition`}
            >
              {loading ? <Spinner /> : "Send OTP"}
            </button>
          </form>
        )}
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
      </motion.div>
    </div>
  );
};

export default Login;

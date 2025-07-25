import axiosInstance from "./url.service";

//method to send otp
export const sendOtp = async () => {
  try {
    const response = await axiosInstance.post("/auth/send-otp", {
      phoneNumber,
      phoneSuffix,
      email,
    });
    return await response.data;
  } catch (error) {
    console.log(
      "sendOtp error: ",
      error?.response ? error.response.data : error.message
    );
    throw error?.response ? error.response.data : error.message;
  }
};

//method to verify the otp
export const verifyOtp = async (phoneNumber, phoneSuffix, email, otp) => {
  try {
    const response = await axiosInstance.post("/auth/verify-otp", {
      phoneNumber,
      phoneSuffix,
      email,
      otp,
    });
    return response.data;
  } catch (error) {
    console.error("verify Otp error: ", verifyOtp);
    throw error?.response ? error.response.data : error.message;
  }
};

//method to logout the user
export const logout = async () => {
  try {
    const response = await axios.get("/auth/logout");
    return response.data;
  } catch (error) {
    console.log(
      "logout error: ",
      error?.response ? error.response.data : error.message
    );
    throw error?.response ? error.response.data : error.message;
  }
};

//method to update the profile data
export const updateProfile = async (updateData) => {
  try {
    const response = await axios.post("/auth/update-profile", updateData);
    return response.data;
  } catch (error) {
    console.log("updateProfile error: ", error);
    throw error?.response ? error.response.data : error.message;
  }
};

//method to get all the users
export const getAllUsers = async () => {
  try {
    const response = await axios.get("/auth/users");
    return response.data;
  } catch (error) {
    console.error("getAllUsers error: ", error);
    throw error?.response ? error.response.data : error.message;
  }
};

//check user is authenticated or not
export const checkUserAuth = async () => {
  try {
    const response = await axiosInstance.get("/auth/check-auth");
    if (response.data.status === "success") {
      return { isAuthenticated: true, user: response?.data?.data };
    } else if (response.data.status === "error") {
      return { isAuthenticated: false };
    }
  } catch (error) {
    console.log(
      "checkUserAuth error: ",
      error?.response ? error.response.data : error.message
    );
    throw error?.response ? error.response.data : error.message;
  }
};

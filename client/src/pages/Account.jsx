import {
  Backdrop,
  Button,
  HelperText,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@windmill/react-ui";
import AccountForm from "components/AccountForm";
import { useTheme } from "context/ThemeContext";
import { useUser } from "context/UserContext";
import Layout from "layout/Layout";
import { useState } from "react";
import { Edit2 } from "react-feather";
import toast from "react-hot-toast";
import PulseLoader from "react-spinners/PulseLoader";
import authService from "services/auth.service";

const Account = () => {
  const { userData } = useUser();
  const [showSettings, setShowSettings] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isMfaSetupOpen, setIsMfaSetupOpen] = useState(false);
  const [mfaSetupPassword, setMfaSetupPassword] = useState("");
  const [mfaSetupError, setMfaSetupError] = useState("");
  const [mfaSetupLoading, setMfaSetupLoading] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaOtpAuthUrl, setMfaOtpAuthUrl] = useState("");
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [mfaVerifyError, setMfaVerifyError] = useState("");
  const [mfaVerifyLoading, setMfaVerifyLoading] = useState(false);
  const [isRemoveMfaOpen, setIsRemoveMfaOpen] = useState(false);
  const [isRemoveMfaLoading, setIsRemoveMfaLoading] = useState(false);
  // const { isDark } = useTheme();

  const resetPassword = () => {
    setIsSending(true);
    authService
      .forgotPassword(userData.email)
      .then((data) => {
        if (data.data.status === "OK") {
          setIsSending(false);
          toast.success("Email has been sent successfully.");
        }
      })
      .catch(() => {
        setIsSending(false);
        toast.error("An error occured. Please try again.");
      });
  };

  const openMfaSetup = () => {
    setIsMfaSetupOpen(true);
    setMfaSetupError("");
    setMfaVerifyError("");
    setMfaQrCode("");
    setMfaOtpAuthUrl("");
    setMfaVerifyCode("");
    setMfaSetupPassword("");
  };

  const closeMfaSetup = () => {
    setIsMfaSetupOpen(false);
    setMfaSetupError("");
    setMfaVerifyError("");
    setMfaSetupLoading(false);
    setMfaVerifyLoading(false);
    setMfaSetupPassword("");
  };

  const handleRemoveMfa = async () => {
    try {
      setIsRemoveMfaLoading(true);
      await authService.removeMfa();
      toast.success("MFA disabled. Please log in again.");
      setIsRemoveMfaOpen(false);
      // window.location.href = "/";
    } catch (error) {
      const res = error.response;
      toast.error(res?.data?.message || "Unable to disable MFA");
    } finally {
      setIsRemoveMfaLoading(false);
    }
  };

  const handleMfaSetup = async (event) => {
    event.preventDefault();
    if (!userData?.email) {
      setMfaSetupError("Unable to load your email. Please refresh.");
      return;
    }

    if (!mfaSetupPassword) {
      setMfaSetupError("Password is required");
      return;
    }

    try {
      setMfaSetupError("");
      setMfaSetupLoading(true);
      const data = await authService.mfaSetup(userData.email, mfaSetupPassword);
      setMfaQrCode(data.qrCodeDataUrl || "");
      setMfaOtpAuthUrl(data.otpauthUrl || "");
    } catch (error) {
      const res = error.response;
      setMfaSetupError(res?.data?.message || "Unable to start MFA setup");
    } finally {
      setMfaSetupLoading(false);
    }
  };

  const handleMfaVerify = async (event) => {
    event.preventDefault();
    if (!userData?.email) {
      setMfaVerifyError("Unable to load your email. Please refresh.");
      return;
    }

    if (!mfaVerifyCode) {
      setMfaVerifyError("MFA code is required");
      return;
    }

    try {
      setMfaVerifyError("");
      setMfaVerifyLoading(true);
      await authService.mfaVerify(userData.email, mfaSetupPassword, mfaVerifyCode);
      toast.success("MFA enabled. Please log in again.");
      closeMfaSetup();
    } catch (error) {
      const res = error.response;
      setMfaVerifyError(res?.data?.message || "Unable to verify MFA code");
    } finally {
      setMfaVerifyLoading(false);
    }
  };

  return (
    <Layout title="Profile" loading={userData === null}>
      {showSettings ? (
        <AccountForm userData={userData} setShowSettings={setShowSettings} />
      ) : (
        <div className="grid place-items-center pt-4 mt-1">
          <div className="w-full md:w-3/4 lg:w-1/2 shadow-md overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3
                className="text-xl leading-6 font-medium 
                  dark:text-white text-gray-900"
              >
                Profile
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Your personal information</p>
            </div>
            <div className="border-t border-gray-200 dark:rounded-lg">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Full name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {userData?.fullname}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Username</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {userData?.username}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Email address</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {userData?.email}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Password</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <Button disabled={isSending} onClick={resetPassword}>
                      {isSending ? (
                        <PulseLoader color={"#01A982"} size={10} />
                      ) : (
                        "Reset password by email"
                      )}
                    </Button>
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Multi-factor authentication</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {userData?.is_mfa_enabled ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-green-600">✓ Enabled</p>
                        <Button
                          disabled={isRemoveMfaLoading}
                          onClick={() => setIsRemoveMfaOpen(true)}
                          className="w-fit"
                        >
                          {isRemoveMfaLoading ? (
                            <PulseLoader size={10} color={"#01A982"} />
                          ) : (
                            "Disable MFA"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button disabled={!userData?.email} onClick={openMfaSetup}>
                        Enable MFA
                      </Button>
                    )}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {userData?.address}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">City</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {userData?.city}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">State</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {userData?.state}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Country</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {userData?.country}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5">
                  <Button iconRight={Edit2} onClick={(e) => setShowSettings(!showSettings)}>
                    {" "}
                    Edit
                  </Button>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}
      {(isMfaSetupOpen || isRemoveMfaOpen) && <Backdrop />}
      <Modal isOpen={isRemoveMfaOpen} onClose={() => setIsRemoveMfaOpen(false)}>
        <ModalHeader>Disable Multi-factor Authentication</ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-700">
            Are you sure you want to disable MFA? Your account will be less secure.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            layout="outline"
            onClick={() => setIsRemoveMfaOpen(false)}
            disabled={isRemoveMfaLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleRemoveMfa} disabled={isRemoveMfaLoading}>
            {isRemoveMfaLoading ? <PulseLoader size={10} color={"#01A982"} /> : "Disable"}
          </Button>
        </ModalFooter>
      </Modal>
      <Modal isOpen={isMfaSetupOpen} onClose={closeMfaSetup}>
        <ModalHeader>Enable MFA</ModalHeader>
        <ModalBody>
          {!mfaQrCode ? (
            <form onSubmit={handleMfaSetup}>
              <Label>
                <span className="font-semibold">Password</span>
                <Input
                  className="mt-1 border py-2 pl-2"
                  type="password"
                  value={mfaSetupPassword}
                  onChange={(event) => setMfaSetupPassword(event.target.value)}
                />
              </Label>
              {mfaSetupError && (
                <HelperText className="mt-2" valid={false}>
                  {mfaSetupError}
                </HelperText>
              )}
              <ModalFooter>
                <Button type="submit" disabled={mfaSetupLoading}>
                  {mfaSetupLoading ? <PulseLoader size={10} color={"#01A982"} /> : "Generate QR"}
                </Button>
              </ModalFooter>
            </form>
          ) : (
            <form onSubmit={handleMfaVerify}>
              <div className="flex flex-col items-center">
                <img src={mfaQrCode} alt="MFA QR code" className="h-40 w-40" />
                {mfaOtpAuthUrl && (
                  <p className="text-xs mt-2 break-all text-center">{mfaOtpAuthUrl}</p>
                )}
              </div>
              <Label className="mt-4">
                <span className="font-semibold">MFA Code</span>
                <Input
                  className="mt-1 border py-2 pl-2"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaVerifyCode}
                  onChange={(event) => setMfaVerifyCode(event.target.value)}
                />
              </Label>
              {mfaVerifyError && (
                <HelperText className="mt-2" valid={false}>
                  {mfaVerifyError}
                </HelperText>
              )}
              <ModalFooter>
                <Button type="submit" disabled={mfaVerifyLoading}>
                  {mfaVerifyLoading ? (
                    <PulseLoader size={10} color={"#01A982"} />
                  ) : (
                    "Verify and Enable"
                  )}
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalBody>
      </Modal>
    </Layout>
  );
};

export default Account;

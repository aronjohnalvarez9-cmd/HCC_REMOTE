export type IntuneSettings = {
  tenantId: string;
  clientId: string;
};

export type ManagedDevice = {
  id: string;
  name: string;
  operatingSystem: string;
  osVersion: string;
  lastSyncDateTime: string | null;
  complianceState: string;
  category: string;
  model: string;
  managementAgent: string;
};

export type DeviceCodeInfo = {
  userCode: string;
  verificationUri: string;
};

export type IntuneConnection = {
  devices: ManagedDevice[];
  accountName: string;
};

declare global {
  interface Window {
    hccRemote: {
      getIntuneSettings(): Promise<IntuneSettings>;
      saveIntuneSettings(settings: IntuneSettings): Promise<IntuneSettings>;
      connectIntune(): Promise<IntuneConnection>;
      refreshIntune(): Promise<ManagedDevice[]>;
      disconnectIntune(): Promise<void>;
      openIntunePortal(): Promise<void>;
      openVerificationUrl(url: string): Promise<void>;
      onDeviceCode(
        callback: (response: DeviceCodeInfo) => void,
      ): () => void;
    };
  }
}

export {};

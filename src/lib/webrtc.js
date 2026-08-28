export const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
        "turns:openrelay.metered.ca:443",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: [
        "turn:staticauth.openrelay.metered.ca:80",
        "turn:staticauth.openrelay.metered.ca:443",
        "turn:staticauth.openrelay.metered.ca:443?transport=tcp",
        "turns:staticauth.openrelay.metered.ca:443",
      ],
      username: "openrelayproject",
      credential: "openrelayprojectsecret",
    },
  ],
  iceCandidatePoolSize: 4,
};

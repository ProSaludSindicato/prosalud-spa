import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import HeroSection from "@/components/home/HeroSection";
import ComfenalcoSection from "@/components/home/ComfenalcoSection";
import ConveniosSection from "@/components/home/ConveniosSection";
import GaleriaBienestarIntroSection from "@/components/home/GaleriaBienestarIntroSection";
import QuickLinksSection from "@/components/home/QuickLinksSection";
import WelcomeModal from "@/components/home/WelcomeModal";
import RequestSuccessModal from "@/components/home/RequestSuccessModal";
import SurveySuccessModal from "@/components/home/SurveySuccessModal";

const Index: React.FC = () => {
  return (
    <MainLayout>
      <WelcomeModal />
      <RequestSuccessModal />
      <SurveySuccessModal />
      <HeroSection />
      <ComfenalcoSection />
      <QuickLinksSection />
      <GaleriaBienestarIntroSection />
      <ConveniosSection />
    </MainLayout>
  );
};

export default Index;

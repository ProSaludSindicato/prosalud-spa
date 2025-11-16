import type React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Heart, Users, Stethoscope, Activity, Plus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import DefinePasswordForm from "@/components/auth/DefinePasswordForm";

const DefinePasswordPage: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 12 },
    },
  };

  const featureVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      transition: { delay: 0.8 + i * 0.1, type: "spring", stiffness: 100 },
    }),
  };

  const floatingIconVariants = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "reverse" as const,
      },
    },
  };

  const features = [
    {
      icon: <Shield className="w-5 h-5 text-primary-prosalud" />,
      title: "Seguro",
      description: "Datos protegidos",
      bgColor: "bg-primary-prosalud-light",
    },
    {
      icon: <Heart className="w-5 h-5 text-red-500" />,
      title: "Bienestar Integral",
      description: "Programas de salud y autocuidado",
      bgColor: "bg-red-500/10",
    },
    {
      icon: <Users className="w-5 h-5 text-secondary-prosaludgreen" />,
      title: "Comunidad",
      description: "Conexión y soporte profesional",
      bgColor: "bg-accent-prosaludteal/10",
    },
    {
      icon: <Activity className="w-5 h-5 text-prosalud-salud" />,
      title: "Formación Continua",
      description: "Capacitaciones y talleres exclusivos",
      bgColor: "bg-prosalud-salud/10",
    },
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-prosalud-light via-white to-secondary-prosaludgreen/5 flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute top-0 right-0 w-full h-full"
        >
          <div className="absolute top-20 left-20 w-32 h-32 bg-primary-prosalud/5 rounded-full blur-xl"></div>
          <div className="absolute top-40 right-32 w-24 h-24 bg-secondary-prosaludgreen/10 rounded-full blur-lg"></div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-accent-prosaludteal/5 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 right-20 w-28 h-28 bg-primary-prosalud/8 rounded-full blur-xl"></div>
        </motion.div>

        {/* Animated Medical Patterns */}
        <div className="absolute inset-0 opacity-5">
          <motion.div
            initial={{ opacity: 0, rotate: -10 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ duration: 1.2, delay: 0.5 }}
            className="absolute top-[10%] left-[5%] w-64 h-64"
          >
            <div className="w-full h-full border-2 border-primary-prosalud rounded-full"></div>
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary-prosalud"></div>
            <div className="absolute top-0 left-1/2 w-0.5 h-full bg-primary-prosalud"></div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.8 }}
            className="absolute bottom-[15%] right-[10%] w-40 h-40"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute inset-0 border border-secondary-prosaludgreen rounded-lg"
                style={{ transform: `rotate(${i * 15}deg)` }}
              ></div>
            ))}
          </motion.div>
        </div>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10"
      >
        {/* Left Side - Brand & Features */}
        <div className="hidden lg:block space-y-8 text-center lg:text-left order-2 lg:order-1">
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="space-y-2">
              <motion.h1
                variants={itemVariants}
                className="text-4xl lg:text-5xl font-bold text-text-dark leading-tight"
              >
                Bienvenido a
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="block"
                >
                  <span className="text-prosalud-pro">Pro</span>
                  <span className="text-prosalud-salud">Salud</span>
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8, duration: 0.4 }}
                    className="inline-block ml-2"
                  >
                    <Sparkles className="w-6 h-6 text-secondary-prosaludgreen inline" />
                  </motion.span>
                </motion.span>
              </motion.h1>
              <motion.p variants={itemVariants} className="text-lg text-text-gray max-w-md mx-auto lg:mx-0">
                Para activar tu acceso al panel administrativo, define una contraseña segura a partir de la invitación
                que recibiste en tu correo.
              </motion.p>
            </div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" className="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                variants={featureVariants}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-prosalud-border/20 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <motion.div
                  variants={floatingIconVariants}
                  className={`w-10 h-10 ${feature.bgColor} rounded-lg flex items-center justify-center mb-3 mx-auto`}
                >
                  {feature.icon}
                </motion.div>
                <h3 className="font-semibold text-text-dark text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-text-gray">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Right Side - Define Password Form */}
        <motion.div variants={itemVariants} className="w-full lg:order-2 perspective-1000">
          <motion.div
            initial={{ opacity: 0, rotateY: -10, z: -100 }}
            animate={{ opacity: 1, rotateY: 0, z: 0 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
            className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-prosalud-border/20 p-6 sm:p-8 lg:p-10 relative overflow-hidden max-w-md mx-auto lg:max-w-none"
          >
            <div className="relative z-10">
              <div className="text-center mb-6">
                <Link to="/" className="inline-block">
                  <motion.img
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    src="/images/logo_prosalud.webp"
                    alt="ProSalud Logo"
                    className="h-16 w-auto mx-auto lg:mx-0"
                  />
                </Link>
              </div>
              <DefinePasswordForm />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Floating Medical Elements */}
      <motion.div variants={floatingIconVariants} animate="animate" className="absolute top-1/4 left-8 hidden xl:block">
        <div className="w-4 h-4 bg-primary-prosalud/20 rotate-45"></div>
      </motion.div>
      <motion.div
        variants={floatingIconVariants}
        animate="animate"
        className="absolute bottom-1/3 right-12 hidden xl:block"
      >
        <div className="w-3 h-3 bg-secondary-prosaludgreen/20 rotate-45"></div>
      </motion.div>
    </div>
  );
};

export default DefinePasswordPage;


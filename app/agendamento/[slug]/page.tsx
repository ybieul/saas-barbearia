"use client"

import { useState } from "react"
import { useParams } from "next/navigation"

export default function AgendamentoPage() {
  const params = useParams()
  const [step, setStep] = useState(1)
  const [customerData, setCustomerData] = useState({
    name: "",
    phone: ""
  })
  const [selectedProfessional, setSelectedProfessional] = useState("")
  const [selectedServices, setSelectedServices] = useState<number[]>([])
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")

  const businessData = {
    name: "Barbearia do João",
    description: "A melhor barbearia da região com profissionais experientes",
    phone: "(11) 99999-9999",
    address: "Rua das Flores, 123 - Centro"
  }

  const professionals = [
    { id: "carlos", name: "Carlos Silva", specialties: ["Corte Masculino", "Barba"], rating: 4.9 },
    { id: "ana", name: "Ana Costa", specialties: ["Escova", "Hidratação"], rating: 4.8 },
    { id: "lucia", name: "Lucia Santos", specialties: ["Coloração", "Corte Feminino"], rating: 4.7 }
  ]

  const services = [
    { id: 1, name: "Corte Masculino", duration: 30, price: 35, popular: true },
    { id: 2, name: "Corte + Barba", duration: 45, price: 45, popular: true },
    { id: 3, name: "Escova", duration: 40, price: 40, popular: false },
    { id: 4, name: "Coloração", duration: 120, price: 120, popular: false },
    { id: 5, name: "Hidratação", duration: 60, price: 40, popular: false },
    { id: 6, name: "Sobrancelha", duration: 15, price: 15, popular: false }
  ]

  const availableTimes = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
  ]

  const upsellSuggestions = [
    { id: 6, name: "Sobrancelha", duration: 15, price: 15 },
    { id: 5, name: "Hidratação", duration: 60, price: 40 }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#18181b] to-[#0a0a0a] text-[#ededed]">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-[#18181b] border border-[#27272a] rounded-xl p-6 shadow-2xl">
          <h1 className="text-2xl font-bold mb-4 text-[#ededed]">{businessData.name}</h1>
          <p className="text-[#71717a] mb-6">{businessData.description}</p>
          
          <div className="text-center">
            <p className="text-[#71717a]">Página de agendamento em desenvolvimento</p>
            <p className="text-sm text-[#a1a1aa] mt-2">Slug: {params.slug}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

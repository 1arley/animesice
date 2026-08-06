'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
    return (
        <div className='w-full h-screen items-center justify-center flex flex-col'>
            <div className='w-full h-screen flex flex-col md:flex-row items-center justify-center gap-8 md:gap-8 lg:gap-24 px-10 md:px-0'>
                <div>
                    <Image
                        priority
                        loading='eager'
                        quality={100}
                        src='/images/animesice-mascot.svg'
                        width={200}
                        height={350}
                        alt='AnimesIce - mascote'
                        style={{ width: 'auto', height: 'auto' }}
                    />
                </div>
                <div className='flex flex-col items-center justify-center gap-20 md:gap-28'>
                    <div className='flex flex-wrap flex-col gap-10 md:gap-12 justify-center'>
                        <div className='flex flex-col justify-center gap-2'>
                            <h1 className='text-4xl md:text-5xl text-center md:text-left text-ink'>Página não encontrada!</h1>
                            <p className='text-sm md:text-base text-mist'>Erro 404 - Página não encontrada</p>
                        </div>
                        <p className='text-wrap max-w-[29rem] text-mist'>Desculpe! O conteúdo que você procura pode ter sido removido, mas novas oportunidades sempre brotam. Que tal explorar nosso site e ver o que pode florescer para você?</p>
                    </div>
                    <div className='flex flex-col md:flex-row gap-7 w-full items-center justify-center'>
                        <button className='btn-ice w-60 h-10 inline-flex items-center justify-center whitespace-nowrap'>
                            <Link
                                className='w-fit'
                                href="/"
                            >
                                Voltar à prateleira
                            </Link>
                        </button>
                    </div>
                </div>
            </div>
            <footer className='absolute w-full bottom-4 flex flex-col space-y-2 items-center'>
                <hr className='w-64 border-hairline' />
                <p className='text-sm text-mist'>© 2026 <Link className='underline text-ice hover:opacity-70' href='/'>AnimesIce</Link>. All rights reserved.</p>
            </footer>
        </div>
    )
}
